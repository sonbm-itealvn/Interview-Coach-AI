import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createDocumentWithChunks,
  createPracticeSession,
  deleteDocument,
  deleteStarStory,
  getPracticeTurns,
  getProfile,
  listDocuments,
  listPracticeSessions,
  listStarStories,
  savePracticeTurn,
  saveProfile,
  saveStarStory,
} from "./db";
import {
  chunkDocumentText,
  extractDocumentText,
  isSupportedDocument,
  MAX_DOCUMENT_BYTES,
  sanitizeFileName,
} from "./documentProcessing";
import { storagePut } from "./storage";

const nullableText = z.string().trim().max(10000).nullable().optional();
const questionTypeSchema = z.enum(["introduction", "experience", "technical", "article", "behavioral"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: router({
    get: protectedProcedure.query(({ ctx }) => getProfile(ctx.user.id)),
    save: protectedProcedure.input(z.object({
      fullName: z.string().trim().max(160).nullable().optional(),
      professionalSummary: nullableText,
      skills: nullableText,
      targetRole: z.string().trim().max(240).nullable().optional(),
      targetCompany: z.string().trim().max(240).nullable().optional(),
      coachingStyle: z.enum(["concise", "balanced", "detailed"]).default("balanced"),
    })).mutation(({ ctx, input }) => saveProfile(ctx.user.id, input)),
  }),
  documents: router({
    list: protectedProcedure.query(({ ctx }) => listDocuments(ctx.user.id)),
    upload: protectedProcedure.input(z.object({
      type: z.enum(["cv", "article", "job_description", "other"]),
      title: z.string().trim().min(2).max(280),
      fileName: z.string().trim().min(1).max(360),
      mimeType: z.string().trim().min(1).max(160),
      base64: z.string().min(8).max(16_800_000),
    })).mutation(async ({ ctx, input }) => {
      if (!isSupportedDocument(input.mimeType, input.fileName)) throw new Error("Only PDF, DOCX, TXT, and Markdown files are supported.");
      const buffer = Buffer.from(input.base64, "base64");
      if (!buffer.length || buffer.length > MAX_DOCUMENT_BYTES) throw new Error("Document must be smaller than 12 MB.");
      const safeName = sanitizeFileName(input.fileName);
      const storage = await storagePut(`interview-coach/${ctx.user.id}/${Date.now()}-${safeName}`, buffer, input.mimeType);
      const extracted = await extractDocumentText(buffer, input.mimeType, input.fileName);
      const chunks = extracted.status === "failed" ? [] : chunkDocumentText(extracted.text);
      const id = await createDocumentWithChunks(ctx.user.id, {
        type: input.type,
        title: input.title,
        fileName: input.fileName,
        mimeType: input.mimeType,
        storageKey: storage.key,
        storageUrl: storage.url,
        extractedText: extracted.text,
        extractionStatus: extracted.status,
        chunks,
      });
      return { id, chunkCount: chunks.length, extractionStatus: extracted.status };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => deleteDocument(ctx.user.id, input.id)),
  }),
  stars: router({
    list: protectedProcedure.query(({ ctx }) => listStarStories(ctx.user.id)),
    save: protectedProcedure.input(z.object({
      id: z.number().int().positive().optional(),
      title: z.string().trim().min(2).max(240),
      skillTags: z.string().trim().max(1200).nullable().optional(),
      situation: z.string().trim().min(10).max(8000),
      task: z.string().trim().min(10).max(8000),
      action: z.string().trim().min(10).max(8000),
      result: z.string().trim().min(10).max(8000),
      metrics: z.string().trim().max(3000).nullable().optional(),
      evidence: z.string().trim().max(5000).nullable().optional(),
    })).mutation(({ ctx, input }) => saveStarStory(ctx.user.id, input)),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => deleteStarStory(ctx.user.id, input.id)),
  }),
  practice: router({
    sessions: protectedProcedure.query(({ ctx }) => listPracticeSessions(ctx.user.id)),
    createSession: protectedProcedure.input(z.object({
      title: z.string().trim().min(2).max(240),
      targetRole: z.string().trim().max(240).nullable().optional(),
    })).mutation(({ ctx, input }) => createPracticeSession(ctx.user.id, input.title, input.targetRole)),
    turns: protectedProcedure.input(z.object({ sessionId: z.number().int().positive() }))
      .query(({ ctx, input }) => getPracticeTurns(ctx.user.id, input.sessionId)),
    saveTurn: protectedProcedure.input(z.object({
      sessionId: z.number().int().positive(),
      question: z.string().trim().min(3).max(12000),
      transcript: z.string().trim().min(1).max(12000),
      questionType: questionTypeSchema,
      outline: z.string().max(12000).nullable().optional(),
      sampleAnswer: z.string().max(24000).nullable().optional(),
      coachingNotes: z.string().max(12000).nullable().optional(),
      sourcesJson: z.string().max(24000).nullable().optional(),
    })).mutation(({ ctx, input }) => savePracticeTurn(ctx.user.id, input)),
  }),
});

export type AppRouter = typeof appRouter;
