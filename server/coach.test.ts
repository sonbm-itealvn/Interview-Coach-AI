import { describe, expect, it } from "vitest";
import { buildCoachMessages, classifyInterviewQuestion, parseCoachGuide, scoreEvidence } from "./coach";

describe("classifyInterviewQuestion", () => {
  it("classifies common interview questions into the requested groups", () => {
    expect(classifyInterviewQuestion("Tell me about yourself.")).toBe("introduction");
    expect(classifyInterviewQuestion("Tell me about a time you handled conflict.")).toBe("behavioral");
    expect(classifyInterviewQuestion("Walk me through the methodology in your research paper.")).toBe("article");
    expect(classifyInterviewQuestion("How would you design a scalable database API?")).toBe("technical");
    expect(classifyInterviewQuestion("Which project are you most proud of?")).toBe("experience");
  });
});

describe("buildCoachMessages", () => {
  it("requires answers to stay grounded in the approved evidence", () => {
    const messages = buildCoachMessages({
      question: "Tell me about your leadership experience.",
      questionType: "behavioral",
      coachingStyle: "balanced",
      sources: [{
        id: "E1",
        label: "STAR — Launch migration",
        kind: "star",
        reference: "Metrics: 30% faster handoff",
        snippet: "Led a cross-functional migration that reduced handoff time by 30%.",
        score: 4,
      }],
    });

    expect(messages[0].content).toContain("never invent personal achievements");
    expect(messages[1].content).toContain("[E1]");
    expect(messages[1].content).toContain("reduced handoff time by 30%");
  });
});

describe("retrieval scoring and guide parsing", () => {
  it("ranks evidence with matching interview terms above unrelated content", () => {
    expect(scoreEvidence("How did you improve onboarding metrics?", "Improved onboarding metrics by 32 percent.")).toBeGreaterThan(
      scoreEvidence("How did you improve onboarding metrics?", "Designed a marketing illustration system.")
    );
  });

  it("separates outline, answer and coaching notes for durable practice history", () => {
    const guide = parseCoachGuide("## Key points\n- Proof\n\n## Sample answer\nI improved onboarding [E1].\n\n## Coaching notes\n- Mention the metric.");
    expect(guide.outline).toContain("Proof");
    expect(guide.sampleAnswer).toContain("[E1]");
    expect(guide.coachingNotes).toContain("metric");
  });
});
