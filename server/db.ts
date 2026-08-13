import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  answerSources,
  candidateProfiles,
  documentChunks,
  interviewDocuments,
  InsertUser,
  practiceSessions,
  practiceTurns,
  starStories,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import type { DocumentChunkInput } from "./documentProcessing";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.lastSignedIn = user.lastSignedIn || new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getProfile(userId: number) {
  const db = await requireDb();
  const result = await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).limit(1);
  return result[0] || null;
}

export async function saveProfile(userId: number, input: {
  fullName?: string | null;
  professionalSummary?: string | null;
  skills?: string | null;
  targetRole?: string | null;
  targetCompany?: string | null;
  coachingStyle: "concise" | "balanced" | "detailed";
}) {
  const db = await requireDb();
  const existing = await getProfile(userId);
  const values = { ...input, updateBy: userId };
  if (existing) {
    await db.update(candidateProfiles).set(values).where(eq(candidateProfiles.userId, userId));
  } else {
    await db.insert(candidateProfiles).values({ userId, ...values, createBy: userId });
  }
  return getProfile(userId);
}

export async function listDocuments(userId: number) {
  const db = await requireDb();
  return db.select({
    id: interviewDocuments.id,
    type: interviewDocuments.type,
    title: interviewDocuments.title,
    fileName: interviewDocuments.fileName,
    mimeType: interviewDocuments.mimeType,
    storageUrl: interviewDocuments.storageUrl,
    extractionStatus: interviewDocuments.extractionStatus,
    chunkCount: interviewDocuments.chunkCount,
    createAt: interviewDocuments.createAt,
  }).from(interviewDocuments).where(eq(interviewDocuments.userId, userId)).orderBy(desc(interviewDocuments.createAt));
}

export async function createDocumentWithChunks(userId: number, input: {
  type: "cv" | "article" | "job_description" | "other";
  title: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  storageUrl: string;
  extractedText: string;
  extractionStatus: "ready" | "needs_review" | "failed";
  chunks: DocumentChunkInput[];
}) {
  const db = await requireDb();
  const insertResult = await db.insert(interviewDocuments).values({
    userId,
    type: input.type,
    title: input.title,
    fileName: input.fileName,
    mimeType: input.mimeType,
    storageKey: input.storageKey,
    storageUrl: input.storageUrl,
    extractedText: input.extractedText,
    extractionStatus: input.extractionStatus,
    chunkCount: input.chunks.length,
    createBy: userId,
    updateBy: userId,
  });
  const documentId = Number(insertResult[0].insertId);
  if (input.chunks.length) {
    await db.insert(documentChunks).values(input.chunks.map(chunk => ({
      documentId,
      userId,
      ...chunk,
      createBy: userId,
      updateBy: userId,
    })));
  }
  return documentId;
}

export async function deleteDocument(userId: number, documentId: number) {
  const db = await requireDb();
  await db.delete(documentChunks).where(and(eq(documentChunks.userId, userId), eq(documentChunks.documentId, documentId)));
  await db.delete(interviewDocuments).where(and(eq(interviewDocuments.userId, userId), eq(interviewDocuments.id, documentId)));
}

export async function listStarStories(userId: number) {
  const db = await requireDb();
  return db.select().from(starStories).where(eq(starStories.userId, userId)).orderBy(desc(starStories.updateAt));
}

export async function saveStarStory(userId: number, input: {
  id?: number;
  title: string;
  skillTags?: string | null;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics?: string | null;
  evidence?: string | null;
}) {
  const db = await requireDb();
  const values = { ...input, updateBy: userId };
  if (input.id) {
    await db.update(starStories).set(values).where(and(eq(starStories.id, input.id), eq(starStories.userId, userId)));
    return input.id;
  }
  const result = await db.insert(starStories).values({ ...values, userId, createBy: userId });
  return Number(result[0].insertId);
}

export async function deleteStarStory(userId: number, storyId: number) {
  const db = await requireDb();
  await db.delete(starStories).where(and(eq(starStories.id, storyId), eq(starStories.userId, userId)));
}

export async function listPracticeSessions(userId: number) {
  const db = await requireDb();
  return db.select().from(practiceSessions).where(eq(practiceSessions.userId, userId)).orderBy(desc(practiceSessions.updateAt));
}

export async function createPracticeSession(userId: number, title: string, targetRole?: string | null) {
  const db = await requireDb();
  const result = await db.insert(practiceSessions).values({ title, targetRole, userId, createBy: userId, updateBy: userId });
  return Number(result[0].insertId);
}

export async function getPracticeTurns(userId: number, sessionId: number) {
  const db = await requireDb();
  const turns = await db.select().from(practiceTurns).where(and(eq(practiceTurns.userId, userId), eq(practiceTurns.sessionId, sessionId))).orderBy(desc(practiceTurns.createAt));
  if (!turns.length) return [];
  const sources = await db.select().from(answerSources)
    .where(and(eq(answerSources.userId, userId), inArray(answerSources.practiceTurnId, turns.map(turn => turn.id))));
  return turns.map(turn => ({
    ...turn,
    sources: sources.filter(source => source.practiceTurnId === turn.id),
  }));
}

export async function savePracticeTurn(userId: number, input: {
  sessionId: number;
  question: string;
  transcript: string;
  questionType: "introduction" | "experience" | "technical" | "article" | "behavioral";
  outline?: string | null;
  sampleAnswer?: string | null;
  coachingNotes?: string | null;
  sourcesJson?: string | null;
  sources?: Array<{
    id: string;
    kind: "profile" | "star" | "document";
    label: string;
    reference: string;
    snippet: string;
    score: number;
  }>;
}) {
  const db = await requireDb();
  const session = await db.select({ id: practiceSessions.id }).from(practiceSessions)
    .where(and(eq(practiceSessions.id, input.sessionId), eq(practiceSessions.userId, userId))).limit(1);
  if (!session[0]) throw new Error("Practice session not found");
  const { sources = [], ...turnInput } = input;
  const result = await db.insert(practiceTurns).values({ ...turnInput, userId, createBy: userId, updateBy: userId });
  const practiceTurnId = Number(result[0].insertId);
  if (sources.length) {
    await db.insert(answerSources).values(sources.map(source => ({
      practiceTurnId,
      userId,
      evidenceKey: source.id,
      sourceKind: source.kind,
      label: source.label,
      reference: source.reference,
      snippet: source.snippet,
      score: Math.round(source.score),
      createBy: userId,
      updateBy: userId,
    })));
  }
  return practiceTurnId;
}

export async function getPracticeContext(userId: number) {
  const db = await requireDb();
  const [profile, stories, chunks] = await Promise.all([
    getProfile(userId),
    listStarStories(userId),
    db.select({
      id: documentChunks.id,
      sectionLabel: documentChunks.sectionLabel,
      pageNumber: documentChunks.pageNumber,
      content: documentChunks.content,
      normalizedTerms: documentChunks.normalizedTerms,
      documentTitle: interviewDocuments.title,
      documentType: interviewDocuments.type,
    }).from(documentChunks)
      .innerJoin(interviewDocuments, eq(documentChunks.documentId, interviewDocuments.id))
      .where(eq(documentChunks.userId, userId)),
  ]);
  return { profile, stories, chunks };
}
