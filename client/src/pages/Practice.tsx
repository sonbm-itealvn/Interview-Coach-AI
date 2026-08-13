import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CoachSource, splitCoachMarkdown } from "@/lib/interview";
import { trpc } from "@/lib/trpc";
import { AudioLines, Bot, ChevronDown, CircleStop, Loader2, Mic, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type RecognitionInstance = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((event: any) => void) | null; onend: (() => void) | null; onerror: ((event: any) => void) | null };
type SpeechWindow = Window & { SpeechRecognition?: new () => RecognitionInstance; webkitSpeechRecognition?: new () => RecognitionInstance };

function CitedAnswer({ text, sources }: { text: string; sources: CoachSource[] }) {
  return <>{text.split(/(\[E\d+\])/g).map((part, index) => {
    const source = sources.find(item => `[${item.id}]` === part);
    if (!source) return <span key={`${part}-${index}`}>{part}</span>;
    return <button key={source.id} type="button" onClick={() => document.getElementById(`source-${source.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="mx-0.5 rounded bg-[#dceeff] px-1 font-bold text-[#31596e] hover:bg-[#b9d9eb]" title={`View ${source.label}`}>{part}</button>;
  })}</>;
}

export default function Practice() {
  const utils = trpc.useUtils();
  const sessions = trpc.practice.sessions.useQuery();
  const createSession = trpc.practice.createSession.useMutation({ onSuccess: () => utils.practice.sessions.invalidate() });
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [coachMarkdown, setCoachMarkdown] = useState("");
  const [sources, setSources] = useState<CoachSource[]>([]);
  const [questionType, setQuestionType] = useState("");
  const recognition = useRef<RecognitionInstance | null>(null);
  const resumeListening = useRef(false);

  useEffect(() => { if (!selectedSession && sessions.data?.[0]) setSelectedSession(sessions.data[0].id); }, [sessions.data, selectedSession]);
  useEffect(() => () => { resumeListening.current = false; recognition.current?.stop(); }, []);

  function startListening() {
    const Constructor = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) { toast.error("Live microphone transcription is not available in this browser. Use Chrome and allow microphone access, or type the question below."); return; }
    recognition.current?.stop();
    const instance = new Constructor();
    recognition.current = instance;
    instance.lang = "en-US";
    instance.continuous = true;
    instance.interimResults = true;
    instance.onresult = event => {
      let finalText = ""; let interimText = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript || "";
        if (result.isFinal) finalText += `${text} `; else interimText += text;
      }
      setQuestion(finalText.trim()); setInterim(interimText.trim());
    };
    instance.onerror = event => { if (event.error !== "no-speech") { toast.error(`Microphone: ${event.error}`); resumeListening.current = false; setListening(false); } };
    instance.onend = () => { if (resumeListening.current) { try { instance.start(); } catch { /* browser is restarting recognition */ } } };
    resumeListening.current = true; setListening(true); instance.start();
  }

  function stopListening() { resumeListening.current = false; recognition.current?.stop(); setListening(false); setInterim(""); }

  async function ensureSession() {
    if (selectedSession) return selectedSession;
    const id = await createSession.mutateAsync({ title: `Practice — ${new Date().toLocaleDateString("en")}`, targetRole: null });
    setSelectedSession(id);
    return id;
  }

  async function generate() {
    const cleanQuestion = question.trim();
    if (cleanQuestion.length < 3) return toast.error("Speak or enter an interview question first.");
    stopListening(); setStreaming(true); setCoachMarkdown(""); setSources([]); setQuestionType("");
    try {
      const sessionId = await ensureSession();
      const response = await fetch("/api/coach/answer-stream", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, question: cleanQuestion, transcript: cleanQuestion }) });
      if (!response.ok || !response.body) throw new Error((await response.json().catch(() => null))?.error || "Could not start the coaching stream.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const events = buffer.split("\n\n"); buffer = events.pop() || "";
        for (const event of events) {
          const line = event.split("\n").find(item => item.startsWith("data:")); if (!line) continue;
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.type === "delta") setCoachMarkdown(previous => previous + payload.delta);
          if (payload.type === "meta") { setSources(payload.sources || []); setQuestionType(payload.questionType || ""); }
          if (payload.type === "error") throw new Error(payload.message);
        }
      }
      utils.practice.sessions.invalidate();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to generate guidance."); }
    finally { setStreaming(false); }
  }

  const sections = splitCoachMarkdown(coachMarkdown);
  return <DashboardLayout><div className="scandi-canvas max-w-7xl"><header className="page-heading"><div><p className="eyebrow">LIVE PRACTICE</p><h1>Interview room</h1><p>Listen for an English question, then generate a cited response you can make your own.</p></div><div className="heading-mark bg-[#dceeff]"><AudioLines className="h-6 w-6 text-[#31596e]" /></div></header>
    <div className="mt-7 grid gap-5 xl:grid-cols-[.85fr_1.15fr]"><section className="scandi-panel p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[#20242a]">Practice session</p><p className="text-xs text-[#7b858c]">Each generated guide is saved to history.</p></div><div className="relative"><select value={selectedSession || ""} onChange={event => setSelectedSession(Number(event.target.value))} className="h-9 appearance-none rounded-full border border-[#dbe0e3] bg-white py-0 pl-4 pr-8 text-sm"><option value="">New session</option>{sessions.data?.map(session => <option key={session.id} value={session.id}>{session.title}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-[#7b858c]" /></div></div>
        <div className={`mt-6 rounded-3xl border p-5 ${listening ? "border-[#9dc6d8] bg-[#eff8fc]" : "border-[#e0e4e6] bg-[#f7f8f8]"}`}><div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className={`relative grid h-10 w-10 place-items-center rounded-2xl ${listening ? "bg-[#31596e] text-white" : "bg-white text-[#657078]"}`}>{listening ? <span className="absolute h-10 w-10 animate-ping rounded-2xl bg-[#b9d9eb]/60" /> : null}<Mic className="relative h-5 w-5" /></span><div><p className="font-semibold text-[#20242a]">{listening ? "Listening in English" : "Microphone ready"}</p><p className="text-xs text-[#758087]">Interim words appear as you speak.</p></div></div>{listening ? <Button type="button" size="sm" onClick={stopListening} className="rounded-full bg-[#20242a] hover:bg-[#353b43]"><CircleStop className="mr-1.5 h-3.5 w-3.5" />Stop</Button> : <Button type="button" size="sm" onClick={startListening} className="rounded-full bg-[#20242a] hover:bg-[#353b43]"><Mic className="mr-1.5 h-3.5 w-3.5" />Listen</Button>}</div><div className="mt-5 min-h-28 rounded-2xl bg-white px-4 py-4 text-[15px] leading-7 text-[#343b40]">{question || <span className="text-[#a0a7ac]">Your transcript will appear here…</span>} {interim ? <span className="text-[#8caeba]">{interim}</span> : null}</div></div>
        <div className="mt-4"><Textarea value={question} onChange={event => setQuestion(event.target.value)} placeholder="Or type/paste an interview question in English…" className="min-h-28 rounded-2xl border-[#dde2e4] bg-white p-4 leading-6" /></div><Button onClick={generate} disabled={streaming || createSession.isPending} className="mt-4 w-full rounded-full bg-[#20242a] py-5 hover:bg-[#353b43]">{streaming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Building your answer…</> : <><Sparkles className="mr-2 h-4 w-4" />Generate coaching guide</>}</Button></section>
      <section className="space-y-4"><div className="scandi-panel overflow-hidden"><div className="flex items-center justify-between border-b border-[#edf0f1] px-5 py-4"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-[#31596e]" /><h2 className="font-display text-xl font-bold tracking-[-.04em]">Your coaching guide</h2></div>{questionType ? <Badge className="border-0 bg-[#e8eff3] text-[#31596e] hover:bg-[#e8eff3]">{questionType}</Badge> : null}</div><div className="min-h-56 p-5">{coachMarkdown ? <div className="space-y-5"><div><p className="answer-label">KEY POINTS</p><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#40484e]">{sections.keyPoints || (streaming ? coachMarkdown : "")}</div></div>{sections.sampleAnswer ? <div className="rounded-2xl bg-[#f4f6f7] p-4"><p className="answer-label">SAMPLE ANSWER</p><p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[#263038]"><CitedAnswer text={sections.sampleAnswer} sources={sources} /></p></div> : null}{sections.coachingNotes ? <div><p className="answer-label">COACHING NOTES</p><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#657078]">{sections.coachingNotes}</div></div> : null}</div> : <div className="flex min-h-48 flex-col items-center justify-center text-center"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f6e8ec]"><Send className="h-5 w-5 text-[#9b5b68]" /></div><p className="mt-4 font-semibold text-[#3a4248]">Ready when you are.</p><span className="mt-1 max-w-xs text-sm leading-6 text-[#889198]">Start listening or type a question, then receive a real-time cited guide.</span></div>}</div></div>
        <div className="scandi-panel p-5"><p className="answer-label">APPROVED SOURCES</p>{sources.length ? <div className="mt-3 space-y-2">{sources.map(source => <div id={`source-${source.id}`} key={source.id} className="rounded-xl bg-[#f7f8f8] px-3 py-3 transition-colors"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#384047]">[{source.id}] {source.label}</p><span className="shrink-0 text-xs text-[#7b858c]">{source.reference}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#778087]">{source.snippet}</p></div>)}</div> : <p className="mt-3 text-sm leading-6 text-[#889198]">Upload documents and add STAR stories to give the coach specific evidence to cite.</p>}</div>
      </section></div>
  </div></DashboardLayout>;
}
