# DocsyChat — Changelog

---

## v4.1 — RAG Pipeline Overhaul

**Previous version (v4.0)** improved retrieval accuracy for case sensitivity and summary queries but still had significant issues with small documents — the model kept defaulting to the most prominent topic in the document regardless of what was asked, and responses were noticeably slower.

---

### Problem 1 — Small documents still getting wrong answers

With `topK=8` and a typical short document having around 17 chunks, every single query was retrieving 47–73% of the entire document. Vector similarity barely mattered at that ratio — nearly the same chunks came back every time. Topics with more text (like SocioLums, which appeared in 4 of 17 chunks) dominated every response even when asking about something else entirely.

On top of that, sentence-aware chunking sometimes produced fragments that started mid-sentence with no topic signal. Those orphaned chunks scored low similarity and got skipped, while the wrong topic's chunks scored higher just because they had cleaner, keyword-rich text.

**Fix:** Documents with 25 chunks or fewer now skip vector search entirely and send all chunks to the model on every message. The full document fits comfortably in the model's context window, there are no retrieval misses, and the model can see everything and answer accurately about any part of it.

---

### Problem 2 — Responses were slower

The v4.0 retrieval flow made 4 separate network calls per message: a COUNT query to Supabase, two embedding API calls (original + lowercase for query expansion), and the vector search RPC — before even calling the AI. For small documents this overhead was entirely wasted since the results were nearly identical every time anyway.

**Fix:** For small documents the flow is now just two calls — fetch all chunks from Supabase, then call the AI. No embedding call, no vector search. This saves roughly 600–900ms per message on short documents.

---

### Problem 3 — Off-topic and capability questions not handled well

Questions like "which model are you using?" or "can you make me a DOCX file?" were being answered with document content instead of a direct response. The system prompt had no explicit instruction for these cases.

**Fix:** System prompt updated to explicitly handle capability questions (cannot create files or exports, but can write structured content as plain text), model identity questions (deflects without revealing the underlying model), and language switching (responds in whatever language the user writes in, including mid-conversation).

---

### Summary of changes

| File | What changed |
|---|---|
| `backend/utils/rag.js` | New `retrieveChunks()` function with automatic small/large doc branching; small docs (≤ 25 chunks) send all content directly, large docs use vector search at 15% topK; removed separate COUNT query |
| `backend/routes/chat.js` | Simplified to use new unified `retrieveChunks()` |
| `backend/utils/ai.js` | System prompt updated for capability questions, model identity, and language switching |
| `backend/.env` | `RAG_CHUNK_SIZE` 1500 → 1000, `RAG_CHUNK_OVERLAP` 200 → 100, added `RAG_MIN_SIMILARITY=0.35` |

> **Note:** Because chunk size changed, delete existing threads and re-upload your documents. Old chunks in Supabase were made with the previous settings and will not benefit from these fixes.
