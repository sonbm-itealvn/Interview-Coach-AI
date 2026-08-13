import type { Express, Request, Response } from "express";
import { buildCoachMessages, buildPracticeContext, parseCoachGuide } from "./coach";
import { createContext } from "./_core/context";
import { ENV } from "./_core/env";
import { streamLLM } from "./_core/llm";
import { savePracticeTurn } from "./db";

type StreamPayload = {
  sessionId?: unknown;
  question?: unknown;
  transcript?: unknown;
};

function sendEvent(res: Response, payload: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function validatePayload(body: StreamPayload) {
  const sessionId = Number(body.sessionId);
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : question;
  if (!Number.isInteger(sessionId) || sessionId <= 0) throw new Error("A valid practice session is required.");
  if (question.length < 3 || question.length > 12000) throw new Error("Please provide a valid interview question.");
  return { sessionId, question, transcript };
}

async function proxyCoachStream(req: Request, res: Response) {
  let finished = false;
  const controller = new AbortController();
  const closeHandler = () => {
    if (!finished) controller.abort();
  };

  try {
    const context = await createContext({ req, res } as Parameters<typeof createContext>[0]);
    if (!context.user) {
      res.status(401).json({ error: "Please sign in to generate coaching guidance." });
      return;
    }

    const { sessionId, question, transcript } = validatePayload(req.body as StreamPayload);
    const practiceContext = await buildPracticeContext(context.user.id, question);
    const messages = buildCoachMessages({ question, ...practiceContext });

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.on("close", closeHandler);

    sendEvent(res, {
      type: "meta",
      questionType: practiceContext.questionType,
      sources: practiceContext.sources,
    });

    const upstream = await streamLLM({
      model: ENV.openAiModel,
      messages,
      maxTokens: 1400,
    }, controller.signal);

    if (!upstream.body) throw new Error("The model did not return a readable stream.");

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullAnswer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const chunk = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            fullAnswer += delta;
            sendEvent(res, { type: "delta", delta });
          }
        } catch {
          // Ignore malformed keep-alive events and wait for the next SSE message.
        }
      }
    }

    const guide = parseCoachGuide(fullAnswer);
    await savePracticeTurn(context.user.id, {
      sessionId,
      question,
      transcript,
      questionType: practiceContext.questionType,
      outline: guide.outline,
      sampleAnswer: guide.sampleAnswer || fullAnswer,
      coachingNotes: guide.coachingNotes,
      sourcesJson: JSON.stringify(practiceContext.sources),
      sources: practiceContext.sources,
    });

    finished = true;
    sendEvent(res, { type: "done" });
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate coaching guidance.";
    if (!res.headersSent) {
      res.status(400).json({ error: message });
    } else if (!finished) {
      sendEvent(res, { type: "error", message });
      res.end();
    }
  } finally {
    finished = true;
    res.off("close", closeHandler);
  }
}

export function registerCoachStream(app: Express) {
  app.post("/api/coach/answer-stream", proxyCoachStream);
}
