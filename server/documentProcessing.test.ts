import { describe, expect, it } from "vitest";
import { chunkDocumentText, isSupportedDocument, normalizeTerms } from "./documentProcessing";

describe("document processing helpers", () => {
  it("accepts supported interview evidence formats", () => {
    expect(isSupportedDocument("application/pdf", "cv.pdf")).toBe(true);
    expect(isSupportedDocument("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "paper.docx")).toBe(true);
    expect(isSupportedDocument("text/plain", "notes.txt")).toBe(true);
    expect(isSupportedDocument("application/zip", "archive.zip")).toBe(false);
  });

  it("creates bounded, searchable chunks with normalized terms", () => {
    const text = "Leadership delivery metrics.\n\n".repeat(160);
    const chunks = chunkDocumentText(text, 140);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.content.length <= 140)).toBe(true);
    expect(chunks[0].normalizedTerms).toContain("leadership");
    expect(normalizeTerms("API API design, faster + reliable.")).toContain("api");
  });
});
