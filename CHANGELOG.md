# DocsyChat — Changelog

---

## v4.6 — RAG & Embedding Optimisation

**Previous version (v4.5)** was the beta release sent to friends for testing.

---

### What changed in v4.6

This release is focused entirely on fixing the embedding quota exhaustion problem reported by beta testers and addressing the underlying RAG architecture inefficiencies that caused it.

---

#### Batch embedding (the main fix)

In v4.5, every chunk was embedded with a separate API call. A 2–3 MB document produces roughly 70–120 chunks, meaning 70–120 individual API requests per upload. On the free tier of `gemini-embedding-001`, this burned through the daily quota very quickly when multiple users uploaded documents on the same day.

In v4.6, all chunks are sent to Gemini's `batchEmbedContents` endpoint in groups of up to 50 texts per request. A 100-chunk document now costs **2 API requests** instead of 100. A 500ms delay between batches keeps the app safe on the free tier without the unnecessary 200ms-per-chunk delay that v4.5 used.

#### Token-aware chunking

v4.5 split documents into ~1,000-character chunks with no awareness of how many tokens that represents. The new chunker targets **400 tokens per chunk** (~1,400 characters), which is well under the embedding model's 2,048-token limit and produces more semantically complete chunks. Overlap is ~15% of chunk size (~210 chars) instead of a fixed 100 chars.

The chunker still respects sentence boundaries — it never splits a sentence in the middle unless a single sentence is longer than the target chunk size. When that happens it falls back to word-boundary splitting.

#### Token-based small-doc detection

v4.5 used a hardcoded threshold of 25 chunks to decide whether to skip vector search. This was brittle — it depended on how the document happened to be chunked, not on how much text was actually in it.

v4.6 measures the **estimated total token count** of the document and compares it to the context budget (6,000 tokens). If the whole document fits, it sends the whole document. This is more accurate and scales correctly regardless of chunk size.

#### Context token budget

Every retrieval path — small doc, summary query, and vector search — now passes results through `applyContextBudget()` before building the context string. This guarantees the app never sends more than 6,000 tokens of document context to the chat model in a single message, regardless of document size or retrieval strategy.

#### Simpler query embedding

v4.5 embedded queries twice (original case + lowercase) and averaged the two vectors. This was meant to make retrieval case-robust but doubled the RPM usage for every chat message. In v4.6, queries are simply lowercased before embedding — a single API call that achieves the same normalisation effect.

#### Vector search results sorted by document position

v4.5 returned vector search results in similarity order (highest match first). This caused answers to feel fragmented or out of order when multiple chunks from different parts of the document were retrieved. In v4.6, results are re-sorted by `chunk_index` after filtering, so the context the AI receives reads in document order.

---

### What was NOT changed

- No database schema changes — v4.6 is a drop-in replacement for v4.5.
- No frontend changes.
- No auth, email, or thread changes.
- No changes to the chat model, system prompt, or response behaviour.

---

### Files changed in v4.6

| File | What changed |
|---|---|
| `backend/utils/rag.js` | Batch embedding; token-aware chunking; context budget; token-based small-doc threshold; single-call query embedding; result sorting by position |
| `backend/.env.example` | Removed `RAG_TOP_K`, `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP` (now internal constants); kept `RAG_MIN_SIMILARITY` |

---

### Embedding API usage comparison

| Scenario | v4.5 API calls | v4.6 API calls |
|---|---|---|
| Upload a 100-chunk document | 100 | 2 |
| Upload a 200-chunk document | 200 | 4 |
| Send a chat message (vector search) | 2 (original + lowercase) | 1 |
| Send a chat message (small/summary doc) | 0 | 0 |

---

## v4.5 — Beta Release

**Previous version (v4.4)** added star/rename threads and last-activity timestamps.

---

### What changed in v4.5

**Forgot password**
- Full email-based password reset flow: enter email → receive 6-digit code → verify code → set new password → redirected to login with a success message.
- Uses the existing `verification_codes` table — no new database tables required.
- Three new backend endpoints: `POST /api/auth/forgot-password`, `POST /api/auth/verify-reset-code`, `POST /api/auth/reset-password`.
- Reset code is verified with a short-lived scoped JWT (15 min expiry) before the password change is accepted.

**Chat search**
- A persistent search box in the sidebar filters threads in real time by chat name or document filename.
- At rest it shows a quiet placeholder. Clicking activates it; clicking outside or pressing Escape closes and clears it.
- Clicking a search result opens the chat and closes search in one action.

**Three-dot menu and account deletion**
- The old sign-out button replaced with a three-dot (⋯) menu with an instant "More options" tooltip.
- Menu contains Sign Out and Delete Account. Delete Account shows a full-screen confirmation modal before executing.
- Account deletion cascades: messages → threads → document chunks → documents → verification codes → user row.

**API quota error handling**
- When the Gemini API returns a 429 rate limit or daily quota error, the app now shows a clear banner to the user instead of a vague AI reply.
- Banners are colour-coded by type: amber for daily quota (try tomorrow), blue for rate limit (wait a minute), grey for document still processing, red for generic errors. All banners are dismissible.
- The "document still processing" case now properly rolls back the user message and returns a 503 instead of passing a placeholder string to the AI.

**Auth screen redesign**
- Login, signup, verify, forgot password, and reset password screens all use a split layout: dark left panel with branding, white right panel with the form.

**White theme**
- App-wide background changed from warm cream to `#f7f8fa`. All surfaces, text, borders, and shadows updated to match neutral values. Paper texture overlay removed.

**Chat header redesign**
- New minimal inline header: file icon + filename + "Document Q&A" as plain text. No badge box, no "+ New" button.
- If the chat has been renamed, the custom title appears as the primary header line and the original document filename appears below it in smaller text.
- Header background has a subtle purple hue matching the app accent colour.

**Sidebar flat buttons**
- "New Document Chat" restyled to a borderless flat button matching Claude's sidebar style.

---

### Files changed in v4.5

| File | What changed |
|---|---|
| `backend/routes/auth.js` | Added forgot-password, verify-reset-code, reset-password, delete-account endpoints |
| `backend/utils/email.js` | Added `sendPasswordResetEmail()` |
| `backend/utils/ai.js` | Added quota error detection — rethrows as `QuotaError` |
| `backend/utils/rag.js` | Added `QuotaError` class and `parseGeminiQuotaError()` |
| `backend/routes/chat.js` | Handles `QuotaError` (429) and no-chunks (503) with proper status codes |
| `frontend/src/utils/api.js` | Added `forgotPassword`, `verifyResetCode`, `resetPassword`, `deleteAccount` |
| `frontend/src/components/AuthScreen.jsx` | Full split-layout redesign; added ForgotPasswordForm, ResetVerifyForm, ResetPasswordForm |
| `frontend/src/components/Sidebar.jsx` | Three-dot menu, delete modal, search box, flat new-chat button |
| `frontend/src/components/ChatWindow.jsx` | Typed error banners; new minimal header with renamed-chat support |
| `frontend/src/styles/globals.css` | White theme CSS variables; removed paper texture |
| `frontend/src/styles/app.css` | Auth split layout; menu; modal; search; flat button; error banner; header styles |

---

## v4.4 — Star, Rename & Thread Activity

**Previous version (v4.3.2)** replaced the ✕ delete button with a Gemini-style bin icon and added an instant tooltip.

---

### What changed in v4.4

**Star threads**
- Star any thread to pin it to the top of the sidebar. Click again to unstar.
- A resting filled star is visible at the far right of the thread item when not hovered. On hover it slides off as the full action row appears.

**Rename threads**
- Click the pencil icon to rename a thread inline. Enter saves, Escape cancels, blur saves.
- The original document filename is preserved in the database — clearing a custom name reverts to the filename.

**Thread re-ordering on activity**
- Sending a message moves the thread to the most recent position in its group. Starred threads stay pinned above unstarred ones.

**Last-activity timestamp**
- Thread timestamps reflect the last message, not when the chat was created. Updates immediately when a message is sent.

**Title truncation fix**
- Long document filenames no longer bleed under the action buttons. Title reserves padding for buttons on hover.

**Sidebar label**
- "RECENT" renamed to "Your Chats".

---

### Files changed in v4.4

| File | What changed |
|---|---|
| `backend/routes/threads.js` | Added `PATCH /:threadId`; `GET /` returns `last_message_at`, `custom_title`, `is_starred` |
| `frontend/src/utils/api.js` | Added `renameThread`, `starThread` |
| `frontend/src/components/ChatLayout.jsx` | Added `handleRenameThread`, `handleStarThread`, `handleMessageSent` |
| `frontend/src/components/ChatWindow.jsx` | Calls `onMessageSent` after each AI response |
| `frontend/src/components/Sidebar.jsx` | Star, rename, delete action row; resting star; last-activity timestamp |
| `frontend/src/styles/app.css` | Thread action system; title padding; resting star animation |
| `SUPABASE_SETUP.sql` | Added `custom_title`, `is_starred` columns and `idx_threads_starred` index |
| `SUPABASE_MIGRATION_v4.4.sql` | New migration — run if upgrading from v4.3.x |

---

## v4.3 — Delete Button & Tooltip Polish

**Previous version (v4.2)** was the last tagged release.

---

### What changed in v4.3

- Replaced the plain ✕ delete button on thread items with a Gemini-style bin icon (SVG trash can).
- Added an instant custom CSS tooltip on the delete button — appears immediately on hover with no browser delay (same `opacity 0.1s` pattern used for the copy button).
- `v4.3.2` — minor CSS refinements to the tooltip positioning.

---

## v4.2 — Copy Button & Thinking Indicator (Last Tag)

### What changed in v4.2

**Copy button**
- Every message has a copy icon next to the timestamp. Hover shows "Copy prompt" or "Copy response". Click copies to clipboard and confirms with a checkmark for 2 seconds. Falls back to `document.execCommand` for older browsers.

**Thinking indicator**
- While the AI is processing, a status message cycles through phases: "Reading your question…" → "Searching the document…" → "Finding relevant sections…" → "Putting the answer together…" → "Almost there…". Transitions with a fade animation.
- After the AI responds, a small "Searched document · Ns" label appears above the message showing how long the response took.

**Smart timestamps**
- Messages show context-aware timestamps: time only for today, "Yesterday · time" for yesterday, date + time for older.

**Auto-focus**
- The message input auto-focuses after every AI response so the user can keep typing without clicking.

**RAG improvements**
- Adaptive `topK` — for large documents, the number of chunks retrieved scales with document size (4–10 chunks, capped at 15% of total).
- Minimum similarity threshold (`RAG_MIN_SIMILARITY=0.35`) filters low-quality vector search results.
- Query expansion — queries are embedded in both original and lowercase form and averaged, making retrieval case-robust.
- Small document optimisation — documents with ≤ 25 chunks skip vector search entirely.
- Summary detection — questions asking for summaries/overviews bypass vector search and send all chunks.
