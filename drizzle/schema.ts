import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const candidateProfiles = mysqlTable(
  "candidate_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().unique(),
    fullName: varchar("full_name", { length: 160 }),
    professionalSummary: text("professional_summary"),
    skills: text("skills"),
    targetRole: varchar("target_role", { length: 240 }),
    targetCompany: varchar("target_company", { length: 240 }),
    coachingStyle: mysqlEnum("coaching_style", ["concise", "balanced", "detailed"])
      .default("balanced")
      .notNull(),
    createAt: timestamp("create_at").defaultNow().notNull(),
    createBy: int("create_by"),
    updateAt: timestamp("update_at").defaultNow().onUpdateNow().notNull(),
    updateBy: int("update_by"),
  }
);

export const interviewDocuments = mysqlTable(
  "interview_documents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    type: mysqlEnum("type", ["cv", "article", "job_description", "other"])
      .notNull(),
    title: varchar("title", { length: 280 }).notNull(),
    fileName: varchar("file_name", { length: 360 }).notNull(),
    mimeType: varchar("mime_type", { length: 160 }).notNull(),
    storageKey: varchar("storage_key", { length: 620 }).notNull(),
    storageUrl: varchar("storage_url", { length: 720 }).notNull(),
    extractedText: text("extracted_text"),
    extractionStatus: mysqlEnum("extraction_status", ["ready", "needs_review", "failed"])
      .default("ready")
      .notNull(),
    chunkCount: int("chunk_count").default(0).notNull(),
    createAt: timestamp("create_at").defaultNow().notNull(),
    createBy: int("create_by"),
    updateAt: timestamp("update_at").defaultNow().onUpdateNow().notNull(),
    updateBy: int("update_by"),
  },
  table => [index("interview_documents_user_idx").on(table.userId)]
);

export const documentChunks = mysqlTable(
  "document_chunks",
  {
    id: int("id").autoincrement().primaryKey(),
    documentId: int("document_id").notNull(),
    userId: int("user_id").notNull(),
    chunkIndex: int("chunk_index").notNull(),
    sectionLabel: varchar("section_label", { length: 280 }),
    pageNumber: int("page_number"),
    content: text("content").notNull(),
    normalizedTerms: text("normalized_terms"),
    createAt: timestamp("create_at").defaultNow().notNull(),
    createBy: int("create_by"),
    updateAt: timestamp("update_at").defaultNow().onUpdateNow().notNull(),
    updateBy: int("update_by"),
  },
  table => [
    index("document_chunks_user_idx").on(table.userId),
    index("document_chunks_document_idx").on(table.documentId),
  ]
);

export const starStories = mysqlTable(
  "star_stories",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    skillTags: text("skill_tags"),
    situation: text("situation").notNull(),
    task: text("task").notNull(),
    action: text("action").notNull(),
    result: text("result").notNull(),
    metrics: text("metrics"),
    evidence: text("evidence"),
    createAt: timestamp("create_at").defaultNow().notNull(),
    createBy: int("create_by"),
    updateAt: timestamp("update_at").defaultNow().onUpdateNow().notNull(),
    updateBy: int("update_by"),
  },
  table => [index("star_stories_user_idx").on(table.userId)]
);

export const practiceSessions = mysqlTable(
  "practice_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    targetRole: varchar("target_role", { length: 240 }),
    status: mysqlEnum("status", ["active", "completed"]).default("active").notNull(),
    createAt: timestamp("create_at").defaultNow().notNull(),
    createBy: int("create_by"),
    updateAt: timestamp("update_at").defaultNow().onUpdateNow().notNull(),
    updateBy: int("update_by"),
  },
  table => [index("practice_sessions_user_idx").on(table.userId)]
);

export const practiceTurns = mysqlTable(
  "practice_turns",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("session_id").notNull(),
    userId: int("user_id").notNull(),
    question: text("question").notNull(),
    transcript: text("transcript").notNull(),
    questionType: mysqlEnum("question_type", [
      "introduction",
      "experience",
      "technical",
      "article",
      "behavioral",
    ]).notNull(),
    outline: text("outline"),
    sampleAnswer: text("sample_answer"),
    coachingNotes: text("coaching_notes"),
    sourcesJson: text("sources_json"),
    createAt: timestamp("create_at").defaultNow().notNull(),
    createBy: int("create_by"),
    updateAt: timestamp("update_at").defaultNow().onUpdateNow().notNull(),
    updateBy: int("update_by"),
  },
  table => [
    index("practice_turns_session_idx").on(table.sessionId),
    index("practice_turns_user_idx").on(table.userId),
  ]
);

export const answerSources = mysqlTable(
  "answer_sources",
  {
    id: int("id").autoincrement().primaryKey(),
    practiceTurnId: int("practice_turn_id").notNull(),
    userId: int("user_id").notNull(),
    evidenceKey: varchar("evidence_key", { length: 32 }).notNull(),
    sourceKind: mysqlEnum("source_kind", ["profile", "star", "document"]).notNull(),
    label: varchar("label", { length: 320 }).notNull(),
    reference: varchar("reference", { length: 320 }).notNull(),
    snippet: text("snippet").notNull(),
    score: int("score").default(0).notNull(),
    createAt: timestamp("create_at").defaultNow().notNull(),
    createBy: int("create_by"),
    updateAt: timestamp("update_at").defaultNow().onUpdateNow().notNull(),
    updateBy: int("update_by"),
  },
  table => [
    index("answer_sources_turn_idx").on(table.practiceTurnId),
    index("answer_sources_user_idx").on(table.userId),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type InterviewDocument = typeof interviewDocuments.$inferSelect;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type StarStory = typeof starStories.$inferSelect;
export type PracticeSession = typeof practiceSessions.$inferSelect;
export type PracticeTurn = typeof practiceTurns.$inferSelect;
export type AnswerSource = typeof answerSources.$inferSelect;
