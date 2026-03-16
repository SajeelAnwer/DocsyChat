# DocsyChat — Changelog

---

## v4.0 — RAG Quality Improvements

**Previous version (v3.2)** was the first fully working build — auth, database, email verification, and RAG all functional. However real-world testing revealed three issues with the quality of AI responses.

All three issues had the same root cause: the RAG pipeline was delivering the wrong context to the model. The model itself was behaving correctly given what it received.

---

### Problem 1 — Case-sensitive retrieval miss

Asking "tell me about sociolums" returned no useful answer. Asking "tell me about SocioLums" returned a correct one. The embedding model encodes capitalisation as part of the vector, so the two queries produced slightly different vectors. With top-5 retrieval the lowercase version sometimes scored just below the cutoff and pulled back irrelevant chunks — the model then correctly said the topic wasn't in the document.

**Fix (`backend/utils/rag.js`):** Added query expansion. When a query contains uppercase letters, both the original and lowercase versions are embedded and the two vectors are averaged before the similarity search. This produces a case-robust embedding that retrieves correctly regardless of how the user typed the query. Queries that are already fully lowercase skip the second embed call.

---

### Problem 2 — Summary and overview queries failing

"Summarize the document" returned "The document doesn't mention anything about summarizing." Vector search works by finding chunks semantically similar to the query — "summarize the document" does not resemble any specific chunk in the document, so retrieval returned unrelated sections and the model correctly refused to answer from them.

**Fix (`backend/utils/rag.js` + `backend/routes/chat.js`):** Added `isSummaryQuery()` — a pattern matcher that detects queries like summarize, overview, main points, key ideas, tell me about this document, etc. When triggered, all chunks are fetched in order instead of running vector search, giving the model the full document to summarise from.

---

### Problem 3 — System prompt too rigid, causing over-refusals

The v3 system prompt had strict numbered rules and a required refusal template. `gemini-2.5-flash-lite` at `temperature: 0.3` applied these very literally. "Computer science in general" was refused because the chunks mentioned CS but not general CS. Asking "summarize" after a topic-focused question was refused with the wrong topic name carried over from the previous exchange. The RAG context was also being injected once into the conversation history header and never refreshed, so earlier context bled into later answers.

**Fix (`backend/utils/ai.js`):** Rewrote the system prompt as natural guidelines instead of numbered rules with a required refusal format. The model is instructed to answer helpfully, decline naturally only when something genuinely is not in the document, and not repeat the refusal phrase on every response. RAG context is now injected fresh with each user message rather than sitting in the history header. Temperature raised from `0.3` to `0.4`, max tokens from `1000` to `1500`.

---

### Files changed

| File | What changed |
|---|---|
| `backend/utils/rag.js` | Added `isSummaryQuery()`, `retrieveAllChunks()`, `getQueryEmbedding()` with query expansion; default topK raised from 5 to 8 |
| `backend/utils/ai.js` | Rewritten system prompt; RAG context injected per-message; temperature 0.3 → 0.4; max tokens 1000 → 1500 |
| `backend/routes/chat.js` | Summary vs. vector search branching; conversation history window increased from 6 to 8 messages |
| `backend/.env` | `RAG_TOP_K` default updated from 5 to 8 |
