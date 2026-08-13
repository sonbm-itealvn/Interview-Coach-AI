import { getPracticeContext } from "./db";

export const questionTypes = [
  "introduction",
  "experience",
  "technical",
  "article",
  "behavioral",
] as const;

export type QuestionType = (typeof questionTypes)[number];

export type SourceReference = {
  id: string;
  label: string;
  kind: "profile" | "star" | "document";
  reference: string;
  snippet: string;
  score: number;
};

const patterns: Array<{ type: QuestionType; matches: string[] }> = [
  { type: "article", matches: ["paper", "article", "research", "methodology", "abstract", "study", "findings", "publication"] },
  { type: "behavioral", matches: ["tell me about a time", "conflict", "failure", "challenge", "pressure", "leadership", "disagree", "mistake"] },
  { type: "technical", matches: ["algorithm", "architecture", "database", "system design", "api", "framework", "technical", "implement", "debug"] },
  { type: "experience", matches: ["project", "experience", "role", "worked", "achievement", "accomplishment", "responsibility"] },
  { type: "introduction", matches: ["tell me about yourself", "introduce yourself", "background", "why should we hire", "why are you interested"] },
];

export function classifyInterviewQuestion(question: string): QuestionType {
  const normalized = question.toLowerCase();
  return patterns.find(group => group.matches.some(match => normalized.includes(match)))?.type || "experience";
}

function terms(value: string) {
  return Array.from(new Set((value.toLowerCase().match(/[a-z0-9][a-z0-9+#.-]{1,}/g) || []).filter(term => term.length > 2)));
}

function relevance(queryTerms: string[], corpus: string) {
  const haystack = corpus.toLowerCase();
  return queryTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export function scoreEvidence(question: string, corpus: string) {
  return relevance(terms(question), corpus);
}

export function parseCoachGuide(markdown: string) {
  const outline = markdown.match(/## Key points\s*([\s\S]*?)(?=## Sample answer|$)/i)?.[1]?.trim() || "";
  const sampleAnswer = markdown.match(/## Sample answer\s*([\s\S]*?)(?=## Coaching notes|$)/i)?.[1]?.trim() || "";
  const coachingNotes = markdown.match(/## Coaching notes\s*([\s\S]*?)$/i)?.[1]?.trim() || "";
  return { outline, sampleAnswer, coachingNotes };
}

export async function buildPracticeContext(userId: number, question: string) {
  const context = await getPracticeContext(userId);
  const questionType = classifyInterviewQuestion(question);
  const queryTerms = terms(question);
  const sources: SourceReference[] = [];

  if (context.profile) {
    const profileText = [
      context.profile.fullName,
      context.profile.professionalSummary,
      context.profile.skills,
      context.profile.targetRole,
      context.profile.targetCompany,
    ].filter(Boolean).join("\n");
    if (profileText) {
      sources.push({
        id: "P1",
        label: "Candidate profile",
        kind: "profile",
        reference: "Personal profile",
        snippet: profileText.slice(0, 1000),
        score: scoreEvidence(question, profileText) + (questionType === "introduction" ? 3 : 0),
      });
    }
  }

  for (const story of context.stories) {
    const text = [story.title, story.skillTags, story.situation, story.task, story.action, story.result, story.metrics, story.evidence]
      .filter(Boolean)
      .join("\n");
    sources.push({
      id: `S${story.id}`,
      label: `STAR — ${story.title}`,
      kind: "star",
      reference: story.metrics ? `Metrics: ${story.metrics}` : "STAR bank",
      snippet: text.slice(0, 1300),
      score: scoreEvidence(question, text) + (questionType === "behavioral" ? 3 : 0),
    });
  }

  for (const chunk of context.chunks) {
    const score = scoreEvidence(question, `${chunk.normalizedTerms || ""} ${chunk.content}`) +
      (questionType === "article" && chunk.documentType === "article" ? 3 : 0) +
      (questionType === "technical" && chunk.documentType === "job_description" ? 1 : 0);
    if (score > 0) {
      sources.push({
        id: `D${chunk.id}`,
        label: `${chunk.documentTitle} — ${chunk.sectionLabel || "Excerpt"}`,
        kind: "document",
        reference: chunk.pageNumber ? `Page ${chunk.pageNumber}` : chunk.documentType.replace("_", " "),
        snippet: chunk.content.slice(0, 1300),
        score,
      });
    }
  }

  return {
    questionType,
    sources: sources
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((source, index) => ({ ...source, id: `E${index + 1}` })),
    coachingStyle: context.profile?.coachingStyle || "balanced",
  };
}

export function buildCoachMessages({
  question,
  questionType,
  coachingStyle,
  sources,
}: {
  question: string;
  questionType: QuestionType;
  coachingStyle: string;
  sources: SourceReference[];
}) {
  const sourceBlock = sources.length
    ? sources.map(source => `[${source.id}] ${source.label} (${source.reference})\n${source.snippet}`).join("\n\n")
    : "No supporting source was retrieved.";

  return [
    {
      role: "system" as const,
      content: `You are an English interview coach. Help the candidate practise, never invent personal achievements, metrics, research claims, or skills. Use only the evidence supplied below. If evidence is missing, state a concise clarification the candidate should provide. Write natural professional English. Return exactly these markdown sections:\n\n## Key points\n- 2 to 4 concise points\n\n## Sample answer\nA polished first-person answer of an appropriate length. Cite every material claim inline as [E1], [E2], etc.\n\n## Coaching notes\n- 2 brief notes on delivery, specificity, or likely follow-up questions.\n\nThe requested coaching style is ${coachingStyle}. The question category is ${questionType}.`,
    },
    {
      role: "user" as const,
      content: `Interview question:\n${question}\n\nApproved evidence:\n${sourceBlock}`,
    },
  ];
}
