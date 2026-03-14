# DocsyChat v3.2 — Changelog (v2.0 -> v3.0 -> v3.1 -> v3.2) Base Version

All notable changes to DocsyChat are documented here, version by version.

---

## v3.0 — Full Rewrite: Database, Auth, and RAG (v3.0 Did not run)

v3.0 was a complete rebuild on top of the v2 codebase. The core in-memory architecture was replaced with persistent storage, proper authentication, and a RAG pipeline. It did not run due to the embedding model issue described below.

### What changed from v2 to v3.0

**Database — Supabase PostgreSQL replacing in-memory store**
All data previously held in JavaScript `Map` objects in memory (lost on every restart) was moved to a Supabase PostgreSQL database. Six tables were introduced: `users`, `verification_codes`, `documents`, `document_chunks`, `threads`, and `messages`. A `SUPABASE_SETUP.sql` file was added to set up the schema from scratch.

**Authentication — email signup and login replacing name-only entry**
The v2 WelcomeScreen (which only asked for a first and last name with no security) was replaced with a full authentication system. Users now sign up with email and password (minimum 8 characters), receive a 6-digit verification code by email (15-minute expiry), and log in to receive a JWT token valid for 7 days. The `WelcomeScreen.jsx` component was removed and replaced with `AuthScreen.jsx` containing three screens: Login, Signup, and Email Verification. All API routes except auth now require a valid JWT via Bearer token.

**Email verification — Nodemailer + Gmail SMTP**
A new `backend/utils/email.js` utility sends branded HTML verification emails from the configured Gmail address using a Gmail App Password. The email includes the 6-digit code in a styled code box.

**RAG pipeline — replacing full-document-per-message approach**
In v2 the entire document (up to 30,000 characters) was included in every single message sent to the AI. In v3 the document is processed once on upload: split into overlapping ~1,500-character chunks, each chunk embedded using an embedding model, and the embeddings stored in Supabase with pgvector. On each chat message only the query is embedded and the top 5 most semantically similar chunks are retrieved. Those chunks (~7,500 characters total) are sent to the AI instead of the full document — reducing token usage by approximately 85%.

**JWT auth middleware**
A new `backend/middleware/auth.js` file validates the Bearer token on every protected route, fetches the user from the database, and confirms the email is verified before allowing the request through.

**Frontend API utility updated**
`api.js` was updated with named exports for all auth calls (`signup`, `login`, `verifyEmail`, `resendCode`, `getMe`). An Axios request interceptor automatically attaches the stored JWT token to every request. User ID and name parameters were removed from document and chat calls since auth now handles user identity.

**Sidebar updated**
Added user email display below the name in the sidebar footer. Added a logout button. Renamed all "DocuChat" references to "DocsyChat."

### Why v3.0 did not run
The embedding model used was `text-embedding-004` via the `@google/generative-ai` Node.js SDK. By the time v3.0 was built (early 2026), Google had deprecated and removed this model. Every embedding call returned a 404 error, meaning no document chunks could be stored and no chat responses could be generated.

---

## v3.1 — Embedding Model Fix (Did not fully work)

v3.1 replaced the deprecated `text-embedding-004` model with `gemini-embedding-001` but still did not run correctly due to the dimension and index issue described below.

### What changed from v3.0 to v3.1

**Embedding model replaced**
`text-embedding-004` was deprecated by Google and removed from the API entirely. Any call to this model returned a 404 error regardless of API version. Replaced with `gemini-embedding-001`, which is the current stable Gemini embedding model.

**Switched from SDK to direct fetch for embeddings**
The `@google/generative-ai` Node.js SDK (v0.21.0) hardcodes the `v1beta` API path for all requests. The initial attempt to use `gemini-embedding-001` via the SDK also failed. Switched to a direct `fetch()` call to the Gemini REST API, giving full control over the endpoint URL and request body.

**Dimensions changed from 768 to 1536**
`text-embedding-004` output 768 dimensions. `gemini-embedding-001` defaults to 3072 dimensions. An attempt was made to use 3072 but Supabase's hosted pgvector has a hard limit of 2000 dimensions on both `ivfflat` and `hnsw` indexes. Used the `output_dimensionality` parameter (Matryoshka Representation Learning) to truncate to 1536 dimensions — high quality, within Supabase's limit, and a common standard dimension size.

**Database schema updated**
The `document_chunks.embedding` column was changed from `vector(768)` to `vector(1536)`. The `match_chunks` SQL function parameter type was updated to match. A migration script `SUPABASE_MIGRATION_v3.1.sql` was added for users upgrading from v3.0.

**Rate limiter warning fixed**
Added `app.set('trust proxy', 1)` in `server.js` to silence the `express-rate-limit` X-Forwarded-For validation warning.

### Why v3.1 did not fully work
The vector index type was initially set to `ivfflat` with 3072 dims (over the 2000-dim limit) and then `hnsw` (also over the limit on Supabase's hosted pgvector). The dimension reduction to 1536 + `ivfflat` index combination that actually worked was only confirmed in v3.2.

---

## v3.2 — Bug Fixes (Current Version)

This is the first fully working version of v3. All three fixes below were required to get v3.1 running correctly.

### Fix 1 — Document name blank in chat header (Minor Issue)
The database returns column names in snake_case (`file_name`) but the `ChatWindow` component expected camelCase (`fileName`). When a thread was loaded from the database the filename showed as empty in the chat header and welcome message.

**Solution:** Added a `normalizeThread()` function in `ChatLayout.jsx` that maps both `file_name` and `fileName` onto every thread object, ensuring all components always receive the correct value regardless of where the thread originated.

**File changed:** `frontend/src/components/ChatLayout.jsx`

---

### Fix 2 — AI message timestamp showing "Invalid Date" (Minor Issue)
User message timestamps displayed correctly because they were set manually in the frontend. AI message timestamps showed "Invalid Date" because the POST `/api/chat/:threadId` response returned the raw Supabase row object which uses `created_at`, while `ChatWindow` reads `timestamp`.

**Solution:** Added `timestamp: aiMsg.created_at` to the POST response so both the GET (history load) and POST (new message) responses use the same field name.

**File changed:** `backend/routes/chat.js`

---

### Fix 3 — Embedding dimension mismatch causing "Invalid API key" error (Major Issue)
The error message in the UI was misleading. The real cause was a dimension mismatch: the `document_chunks` table had a `vector(1536)` column but the embedding model was returning a different number of values, causing the Supabase insert to fail. The backend caught this and returned a generic error which the frontend displayed as "Invalid API key."

**Solution:** Confirmed that `gemini-embedding-001` with `output_dimensionality: 1536` returns exactly 1536 values matching the column definition. Improved backend error logging to surface the real error message directly in the UI instead of masking it.

**Files changed:** `backend/routes/chat.js`, `backend/utils/rag.js`

---

## v2 — Original Working Version (The Demo Version)

The starting point for the v3 rewrite. A functional but stateless single-session document chatbot with no authentication or persistence.

**Architecture:** React 18 frontend, Node.js/Express backend, Google Gemini `gemini-2.5-flash-lite` for chat.

**How it worked:** Upload a document → text extracted and held in memory → every message sends the full document text (up to 30,000 characters) to the AI along with the last 10 messages of conversation history → AI answers from the document. All data lost on server restart.

**Design:** Warm cream theme (`#f5f0e8` background), purple accent (`#7950B0`), dark sidebar (`#1a1814`), Fraunces + Instrument Sans typography. This design system carried forward into v3 unchanged.
