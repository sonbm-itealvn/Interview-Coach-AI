import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
  listDocuments: vi.fn(),
  createDocumentWithChunks: vi.fn(),
  deleteDocument: vi.fn(),
  listStarStories: vi.fn(),
  saveStarStory: vi.fn(),
  deleteStarStory: vi.fn(),
  listPracticeSessions: vi.fn(),
  createPracticeSession: vi.fn(),
  getPracticeTurns: vi.fn(),
  savePracticeTurn: vi.fn(),
}));

import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 17,
      openId: "candidate-17",
      name: "Alex Morgan",
      email: "alex@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("authenticated interview-coach procedures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves a candidate profile for the authenticated user", async () => {
    vi.mocked(db.saveProfile).mockResolvedValue(null);
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await caller.profile.save({
      fullName: "Alex Morgan",
      professionalSummary: "Product designer",
      skills: "Figma",
      targetRole: "Senior Product Designer",
      targetCompany: null,
      coachingStyle: "balanced",
    });
    expect(db.saveProfile).toHaveBeenCalledWith(17, expect.objectContaining({ fullName: "Alex Morgan", coachingStyle: "balanced" }));
  });

  it("saves a STAR story and scopes it to the authenticated user", async () => {
    vi.mocked(db.saveStarStory).mockResolvedValue(81);
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await caller.stars.save({
      title: "Improved onboarding",
      skillTags: "Leadership",
      situation: "A slow intake process",
      task: "Improve the workflow",
      action: "Created a checklist",
      result: "Faster completion",
      metrics: "32% faster",
      evidence: "Delivery report",
    });
    expect(db.saveStarStory).toHaveBeenCalledWith(17, expect.objectContaining({ title: "Improved onboarding" }));
  });

  it("returns only history queried through the authenticated caller", async () => {
    vi.mocked(db.getPracticeTurns).mockResolvedValue([]);
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await caller.practice.turns({ sessionId: 33 });
    expect(db.getPracticeTurns).toHaveBeenCalledWith(17, 33);
  });
});
