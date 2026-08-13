# Interview Coach AI — Model and Training Guide

## What the application uses today

The web app deliberately uses **retrieval-augmented generation (RAG)** before any fine-tuning. This is the safer and more effective first step for personal interview preparation because a candidate’s CV, STAR stories, job descriptions, and articles change over time. The application stores these sources per user, extracts text from PDF/DOCX/TXT/Markdown files, creates bounded excerpts, and retrieves relevant evidence before every generated answer.

The live interview-coach response uses **`gpt-5-mini`** from the platform model catalog. It is selected for quick structured generation at a practical cost. The server opens an SSE response with `stream: true` and sends deltas directly to the browser, so the coaching guide starts rendering before the complete answer is available. The system prompt requires the model to use only approved evidence and to cite material statements with `[E1]`, `[E2]`, and so on.

| Requirement | Current implementation | Why it is appropriate |
|---|---|---|
| English question transcript | Browser Speech Recognition API with `en-US`, `continuous` and `interimResults` | Produces interim text while the candidate is speaking in supported Chromium browsers. |
| Answer generation | `gpt-5-mini` via server-side SSE | Keeps credentials on the server and supports progressive output. |
| Personalisation | Profile, STAR bank, uploaded documents and per-user retrieval | Keeps personal facts current without retraining a shared base model. |
| Source attribution | `answer_sources` table plus evidence identifiers in the generated answer | Every saved turn retains the exact source cards used for the answer. |
| Question classification | Deterministic English pattern classifier | Low latency and transparent categorisation for the five MVP question groups. |

> Do not fine-tune a model on a raw CV, a single article, or a single candidate’s chat history. That information should stay in the user-owned evidence library and be supplied by retrieval only when relevant.

## Recommended data preparation

The quality of coaching depends more on **structured, verified source material** than on an early model fine-tune. First, build a profile and evidence library with factual inputs. Keep one STAR story per distinct accomplishment; include the objective metric, the proof/source of the metric, and the skills demonstrated. For articles, retain section headings and page references when possible.

| Dataset | Minimum useful content | Quality rule |
|---|---|---|
| Candidate profile | Career summary, target role, skills and target company | Write only claims the candidate can defend. |
| STAR bank | 5–10 stories with Situation, Task, Action, Result, metrics and evidence | Avoid vague results such as “improved a lot”; record a number or observable outcome. |
| Job descriptions | Role requirements, responsibilities and terminology | Upload a separate document for each target role. |
| Articles | Full text plus an accurate title and document type | Check extraction when the file is scanned or image-heavy. |
| Evaluation set | 30–50 representative English interview questions with an approved evidence list | Reserve this set for measurement; do not use it as a training set. |

## Improve the MVP before fine-tuning

Use the evaluation set to score four measurable outcomes: transcript quality, question-type accuracy, evidence precision, and answer usefulness. Review every answer that cites the wrong evidence, invents a fact, or omits a strong STAR story. Then improve the structured profile, retrieval rules, evidence chunks, and system prompt. This loop is usually more reliable than adapting a foundation model.

For a production upgrade, replace the current lexical scoring with vector embeddings and semantic retrieval. Preserve the same `answer_sources` provenance records so every retrieved passage remains visible and auditable.

## Optional fine-tuning plan

Fine-tuning becomes reasonable only after the application has a sizable, consented, de-identified corpus of high-quality examples that teach a **stable style or reasoning pattern**, such as converting approved facts into concise STAR answers. It should not be used to memorise private resumes or papers.

1. Collect at least several hundred approved examples across the five question categories. Remove names, email addresses, account numbers, employer-confidential details, and raw audio.
2. Store each example as a JSONL conversation with the question, an explicit evidence block, and an ideal answer. Keep citations in the target answer so the model learns the expected provenance behaviour.
3. Split the examples into train, validation, and untouched evaluation sets. Ensure that variants of the same STAR story stay in the same split.
4. Train a small adaptation only after the RAG baseline has been measured. Continue passing fresh profile and document evidence at inference time; fine-tuning does not replace retrieval.
5. Compare the fine-tuned model against the `gpt-5-mini` baseline on evidence precision, citation accuracy, answer clarity, latency, and cost. Reject the fine-tune if it makes unsupported claims more frequent.
6. Add human review and a rollback path before using a new model configuration in a live product.

An illustrative training example should resemble the following shape, using fictional and non-sensitive content:

```json
{"messages":[{"role":"system","content":"Answer only from approved evidence and cite [E1]."},{"role":"user","content":"Question: Tell me about a time you improved a process.\nEvidence [E1]: Reduced candidate onboarding handoffs from 10 to 6 days by redesigning intake."},{"role":"assistant","content":"I improved our candidate onboarding process by redesigning the intake workflow... [E1]"}]}
```

## Privacy and retention

Candidate data is personal and potentially sensitive. Keep the evidence library per user, retain only the metadata and source references necessary for the product, and give users a clear deletion path. Do not capture or store raw microphone audio by default. The browser transcription implementation is designed to show interim text for practice; uploaded documents and generated guidance are the only inputs persisted by the application.
