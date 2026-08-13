import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getPracticeContext: vi.fn(),
}));

import { buildPracticeContext } from "./coach";
import { getPracticeContext } from "./db";

describe("buildPracticeContext", () => {
  beforeEach(() => {
    vi.mocked(getPracticeContext).mockResolvedValue({
      profile: {
        fullName: "Alex Morgan",
        professionalSummary: "Product designer focused on mobile onboarding.",
        skills: "Figma, product strategy",
        targetRole: "Product designer",
        targetCompany: null,
        coachingStyle: "balanced",
      },
      stories: [{
        id: 8,
        title: "Reduced design review time",
        skillTags: "collaboration",
        situation: "Review meetings were slow.",
        task: "Improve the feedback process.",
        action: "Introduced structured critique templates.",
        result: "The team made decisions faster.",
        metrics: "20% faster reviews",
        evidence: "Quarterly delivery report",
      }],
      chunks: [{
        id: 31,
        sectionLabel: "Methodology",
        pageNumber: 4,
        content: "The research methodology used a mixed-method study with interview participants.",
        normalizedTerms: "research methodology mixed method study interview",
        documentTitle: "Onboarding research paper",
        documentType: "article",
      }],
    } as never);
  });

  it("prioritises article excerpts for a research-methodology question", async () => {
    const context = await buildPracticeContext(4, "Could you explain the research methodology in your study?");

    expect(context.questionType).toBe("article");
    expect(context.sources[0]).toMatchObject({ kind: "document", label: "Onboarding research paper — Methodology", reference: "Page 4" });
    expect(context.sources[0]?.id).toBe("E1");
  });
});
