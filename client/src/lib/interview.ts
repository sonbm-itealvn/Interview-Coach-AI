export type CoachSource = {
  id: string;
  label: string;
  kind: "profile" | "star" | "document";
  reference: string;
  snippet: string;
  score: number;
};

export function splitCoachMarkdown(markdown: string) {
  const normalized = markdown.trim();
  const keyPoints = normalized.match(/## Key points\s*([\s\S]*?)(?=## Sample answer|$)/i)?.[1]?.trim() || "";
  const sampleAnswer = normalized.match(/## Sample answer\s*([\s\S]*?)(?=## Coaching notes|$)/i)?.[1]?.trim() || "";
  const coachingNotes = normalized.match(/## Coaching notes\s*([\s\S]*?)$/i)?.[1]?.trim() || "";
  return { keyPoints, sampleAnswer, coachingNotes };
}

export function formatShortDate(value: Date | string | number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export async function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}
