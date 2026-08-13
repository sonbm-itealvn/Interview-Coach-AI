import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const MAX_DOCUMENT_BYTES = 12 * 1024 * 1024;

export type DocumentKind = "cv" | "article" | "job_description" | "other";

export type ExtractedDocument = {
  text: string;
  status: "ready" | "needs_review" | "failed";
};

export type DocumentChunkInput = {
  chunkIndex: number;
  sectionLabel: string;
  pageNumber: number | null;
  content: string;
  normalizedTerms: string;
};

const supportedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

export function isSupportedDocument(mimeType: string, fileName: string) {
  const extension = fileName.toLowerCase().split(".").pop();
  return supportedMimeTypes.has(mimeType) || ["pdf", "docx", "txt", "md"].includes(extension || "");
}

export function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "document";
}

export function normalizeTerms(value: string) {
  return Array.from(new Set((value.toLowerCase().match(/[a-z0-9][a-z0-9+#.-]{1,}/g) || []).filter(term => term.length > 2)))
    .slice(0, 250)
    .join(" ");
}

export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractedDocument> {
  const extension = fileName.toLowerCase().split(".").pop();

  try {
    if (mimeType === "application/pdf" || extension === "pdf") {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      const text = result.text.trim();
      return { text, status: text.length > 80 ? "ready" : "needs_review" };
    }

    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      extension === "docx"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim();
      return { text, status: text.length > 80 ? "ready" : "needs_review" };
    }

    const text = buffer.toString("utf8").trim();
    return { text, status: text.length > 20 ? "ready" : "needs_review" };
  } catch (error) {
    console.warn("[Document extraction]", error);
    return { text: "", status: "failed" };
  }
}

export function chunkDocumentText(text: string, maxCharacters = 1100): DocumentChunkInput[] {
  const paragraphs = text
    .replace(/\r/g, "")
    .split(/\n{2,}|(?<=\.)\s{2,}/)
    .map(part => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const chunks: DocumentChunkInput[] = [];
  let buffer = "";

  const pushChunk = () => {
    const content = buffer.trim();
    if (!content) return;
    chunks.push({
      chunkIndex: chunks.length,
      sectionLabel: `Excerpt ${chunks.length + 1}`,
      pageNumber: null,
      content,
      normalizedTerms: normalizeTerms(content),
    });
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxCharacters) {
      pushChunk();
      for (let offset = 0; offset < paragraph.length; offset += maxCharacters) {
        buffer = paragraph.slice(offset, offset + maxCharacters);
        pushChunk();
      }
      continue;
    }

    if (buffer && buffer.length + paragraph.length + 1 > maxCharacters) pushChunk();
    buffer = `${buffer} ${paragraph}`.trim();
  }

  pushChunk();
  return chunks.slice(0, 120);
}
