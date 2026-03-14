# DocsyChat v3 — Changes from v2

## Overview
v3 adds three major upgrades to the v2 codebase:
1. **Supabase PostgreSQL database** — persistent storage replacing in-memory store
2. **Email auth** — full signup / login / email verification flow
3. **RAG (Retrieval-Augmented Generation)** — 80–90% reduction in API token usage

---

## New Files Added

### Backend
| File | Purpose |
|------|---------|
| `backend/utils/supabase.js` | Supabase client initialization |
| `backend/utils/email.js` | Nodemailer Gmail SMTP — sends 6-digit verification emails |
| `backend/utils/rag.js` | RAG logic: document chunking, Gemini embeddings, vector retrieval |
| `backend/middleware/auth.js` | JWT auth middleware — protects all routes |
| `backend/routes/auth.js` | Signup, login, verify email, resend code, /me endpoints |
| `SUPABASE_SETUP.sql` | Full SQL to run in Supabase Dashboard — creates all tables + functions |

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/components/AuthScreen.jsx` | Login, Signup, and Email Verification screens |

---

## Modified Files

### Backend
| File | What Changed |
|------|-------------|
| `backend/.env` | Added: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `EMAIL_FROM`, `EMAIL_APP_PASSWORD`, RAG settings |
| `backend/package.json` | Added: `@supabase/supabase-js`, `bcryptjs`, `jsonwebtoken`, `nodemailer`, `express-validator` |
| `backend/server.js` | Added auth routes, separate rate limiter for auth endpoints |
| `backend/routes/upload.js` | Now requires auth. Stores document in Supabase. Triggers background embedding via RAG |
| `backend/routes/chat.js` | Now requires auth. Uses RAG (retrieves top-K chunks) instead of sending full document. Saves messages to Supabase |
| `backend/routes/threads.js` | Now requires auth. Reads/deletes from Supabase. Cascades chunk/document cleanup on thread delete |
| `backend/utils/ai.js` | Receives RAG context (relevant chunks only) instead of full document text |

### Frontend
| File | What Changed |
|------|-------------|
| `frontend/src/App.js` | Replaced name-only flow with token-based auth. Checks JWT on load via `/api/auth/me` |
| `frontend/src/utils/api.js` | Added: `signup`, `login`, `verifyEmail`, `resendCode`, `getMe`. Removed userId params. JWT auto-attached via Axios interceptor |
| `frontend/src/components/ChatLayout.jsx` | Removed userId dependency (auth handles it). Uses updated `getThreads()` |
| `frontend/src/components/UploadZone.jsx` | Removed firstName/lastName/userId params (no longer needed) |
| `frontend/src/components/Sidebar.jsx` | Renamed "DocuChat" → "DocsyChat". Added email display under user name. Uses `file_name` field from DB |
| `frontend/src/styles/app.css` | Added: `.auth-error`, `.auth-success`, `.auth-switch`, `.auth-link`, `.sidebar__useremail` |

### Removed Files
| File | Reason |
|------|--------|
| `frontend/src/components/WelcomeScreen.jsx` | Replaced by `AuthScreen.jsx` |
| `backend/utils/store.js` | Replaced by Supabase |

---

## Database Schema (Supabase)

```
users               — accounts (email, password hash, name, verified flag)
verification_codes  — 6-digit codes with 15-min expiry
documents           — uploaded file metadata
document_chunks     — text chunks with 768-dim vector embeddings
threads             — chat sessions linked to a document
messages            — individual chat messages
```

---

## How RAG Works (API Usage Reduction)

**Before (v2):** Every question sent the entire document (up to 30,000 characters) to Gemini.

**After (v3):**
1. On upload, the document is split into ~1,500 char chunks with 200 char overlap
2. Each chunk is embedded using Gemini `text-embedding-004` (one-time cost)
3. On each question, only the query is embedded and the top 5 most similar chunks (~7,500 chars) are retrieved
4. Only those 5 chunks are sent to Gemini with the question

**Result:** ~80–90% reduction in tokens sent per question.

---

## Credentials Used

The following credentials are stored in `backend/.env`:

| Key | Description |
|-----|-------------|
| `SUPABASE_URL` | `https://glgxtrbxhmgfqkaofjfi.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase public anon key (from Settings → API) |
| `SUPABASE_DB_PASSWORD` | Password set when creating the Supabase project |
| `EMAIL_FROM` | `docsychat@gmail.com` |
| `EMAIL_APP_PASSWORD` | Gmail App Password created under app name "DocsyChat" |
| `JWT_SECRET` | Random string — **change this in production** |
| `GEMINI_API_KEY` | Your Gemini API key |

---

## Setup Instructions for v3

### Step 1 — Run the SQL
1. Go to your Supabase project → **SQL Editor**
2. Open `SUPABASE_SETUP.sql` and run the entire file
3. You should see all 7 tables created + the `match_chunks` function

### Step 2 — Configure .env

Open `Env File Contents (read me).txt` and do the tasks.
Open `backend/.env` and fill in your `GEMINI_API_KEY`

### Step 3 — Install & Run
```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm start
```

### Step 4 — First Use
1. Open http://localhost:3000
2. Click **Sign up** → enter your name, email, password
3. Check your email for the 6-digit code from `docsychat@gmail.com`
4. Enter the code → you're in!
