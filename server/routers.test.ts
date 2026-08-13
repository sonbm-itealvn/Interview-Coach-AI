import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("interview-coach protected procedures", () => {
  it("does not expose profile data to an anonymous caller", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.profile.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("does not create practice sessions for an anonymous caller", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.practice.createSession({ title: "Practice", targetRole: null })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
