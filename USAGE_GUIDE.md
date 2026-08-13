# Interview Coach AI — Setup and Usage Guide

## Purpose

Interview Coach AI is a personal English interview-practice application. It helps a signed-in candidate organise professional evidence, practise against spoken or typed English questions, receive a streamed coaching guide, and revisit prior sessions. The product is intended for preparation and self-coaching.

## Source layout

| Path | Responsibility |
|---|---|
| `client/src/pages/` | Dashboard, Profile, Evidence Library, STAR Bank, Practice Room and History interfaces. |
| `client/src/components/` | Shared UI components, including the authenticated dashboard shell. |
| `server/routers.ts` | Protected tRPC procedures for profiles, documents, STAR stories and practice history. |
| `server/coachStream.ts` | Authenticated SSE endpoint for streamed coaching output. |
| `server/coach.ts` | Question classification, retrieval context, evidence prompt construction and guide parsing. |
| `server/documentProcessing.ts` | PDF, DOCX and text extraction, chunking and terms normalisation. |
| `server/db.ts` | Per-user database access helpers and provenance persistence. |
| `drizzle/schema.ts` | Drizzle schema for application tables. |
| `drizzle/*.sql` | Generated migration history. |
| `TRAINING_GUIDE.md` | Model selection, RAG strategy and optional fine-tuning plan. |

## Prerequisites

The project uses Node.js 22+, pnpm 10+, a MySQL-compatible database, and an S3-compatible storage layer. The bundled template is designed for the Manus full-stack environment, which injects the database, authentication, storage and Forge LLM environment variables. Do not commit any `.env` file or service key.

The document-extraction functionality uses the `mammoth` and `pdf-parse` packages. The UI uses the browser Speech Recognition API for live interim English transcription. Chrome or another Chromium-based browser with microphone permission is recommended for this experience.

## Local development

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Run the TypeScript check and test suite before making a release:

```bash
pnpm check
pnpm test
```

When modifying `drizzle/schema.ts`, generate a migration, inspect the generated SQL, and apply it to the target database through your managed schema-migration workflow. Never run a destructive migration until a backup and rollback plan are available.

```bash
pnpm drizzle-kit generate
```

## First-use workflow

First, sign in and open **Profile**. Add a factual professional summary, target role, skills and the desired coaching detail. This is the personal context used when generating a practice answer.

Next, open **Evidence library** and upload a CV, job description or article in PDF, DOCX, TXT or Markdown format. The application stores the source in object storage, extracts its text, creates searchable excerpts and retains document metadata in the database. Review an extraction if the file is scanned or image-heavy.

Then, add several **STAR stories**. Every story should include a Situation, Task, Action, Result, measurable outcome and a pointer to supporting evidence. The more specific this bank is, the more useful the generated interview guidance becomes.

Finally, open **Practice room**. Speak an English question or type/paste it in English. The browser displays interim transcript text while it is listening. Select or create a practice session, then choose **Generate coaching guide**. The app streams the guide while it is generated, shows inline evidence identifiers such as `[E1]`, and lets the candidate jump to each source card. The completed guide, transcript, outline, coaching notes and sources are stored in **History**.

## AI implementation

The SSE coach endpoint is `POST /api/coach/answer-stream`. It authenticates the account, builds a per-user evidence context, requests `gpt-5-mini` with `stream: true`, and forwards model deltas to the browser. The prompt instructs the model to produce English output under three headings: Key points, Sample answer and Coaching notes. It also requires citations only from the approved evidence identifiers.

The current retrieval MVP uses deterministic question classification plus lexical evidence scoring. It is intentionally transparent and low-latency. For higher recall with a larger document library, implement vector embeddings and semantic search while continuing to save each selected source in `answer_sources`.

## Important limitations

The Speech Recognition API is browser-vendor dependent and may be unavailable in some browsers or privacy configurations. When this happens, the Practice Room provides a typed-question fallback. The application does not persist raw microphone audio by default.

The assistant is designed as a practice coach, not a source of new facts. Generated content should be reviewed by the candidate. The retrieval and prompt layers are designed to reduce unsupported claims, but they cannot replace human verification.

## Training and customisation

Read [`TRAINING_GUIDE.md`](./TRAINING_GUIDE.md) before considering a model fine-tune. The recommended sequence is to improve structured personal evidence and retrieval quality first, evaluate with representative English interview questions, and only then consider a consented, de-identified dataset for an optional fine-tune.
