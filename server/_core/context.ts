import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Local development mock user
  let user: User = {
    id: 1,
    openId: "local-developer-id",
    name: "Local Developer",
    email: "developer@localhost",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date()
  };

  try {
    // We ensure the local user exists in the DB so relational queries don't fail
    await db.upsertUser({
      openId: user.openId,
      name: user.name,
      email: user.email,
      loginMethod: user.loginMethod,
      lastSignedIn: user.lastSignedIn,
    });
    
    // Since db.upsertUser doesn't return the ID, we query it back to have a fully valid User object with correct DB ID
    const dbUser = await db.getUserByOpenId(user.openId);
    if (dbUser) {
      user = dbUser;
    }
  } catch (err) {
    console.error("Warning: Failed to inject mock user into DB (is the DB running and schema pushed?). Using in-memory mock user.", err);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
