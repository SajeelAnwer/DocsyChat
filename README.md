# 📄 DocsyChat v4.1.1 — AI Document Q&A Chatbot

A full-stack AI-powered document Q&A chatbot. Upload a PDF, DOCX, or TXT file and ask questions about it — DocsyChat answers from the document's content using Retrieval-Augmented Generation (RAG). Summarize it, ask specific questions, or dig into details — all grounded in what's actually in the file.

---

## ✨ Features

- **Document Q&A** — upload a document and get answers grounded in its content
- **Adaptive RAG pipeline** — automatically selects the best retrieval strategy based on document size; small documents skip vector search entirely for faster and more accurate responses
- **Summary detection** — asking for a summary or overview sends the full document to the model instead of running vector search
- **Case-robust retrieval** — query expansion ensures results are consistent regardless of how you capitalize your question
- **Email authentication** — signup with email and password, verified via a 6-digit code sent to your inbox
- **Persistent storage** — all users, documents, threads, and messages stored in Supabase PostgreSQL
- **Conversation history** — chat threads persist across sessions with full message history
- **Multi-provider AI** — defaults to Google Gemini, configurable to OpenAI
- **Warm cream UI** — Fraunces + Instrument Sans typography, purple accent, dark sidebar

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| Supabase (PostgreSQL + pgvector) | Persistent database and vector similarity search |
| Google Gemini `gemini-2.5-flash-lite` | Chat response generation |
| Google Gemini `gemini-embedding-001` | Document and query embeddings (1536 dimensions) |
| bcryptjs | Password hashing (12 salt rounds) |
| jsonwebtoken | JWT session tokens (7-day expiry) |
| Nodemailer + Gmail SMTP | Verification email delivery |
| multer | File upload handling |
| pdf-parse + mammoth | PDF and DOCX text extraction |
| express-rate-limit | Rate limiting — 100 req/15 min general, 20 req/15 min on auth routes |
| express-validator | Input validation on auth endpoints |

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Axios | HTTP client with automatic JWT header attachment |
| react-markdown | Renders AI responses as formatted markdown |
| framer-motion | UI animations |
| Fraunces + Instrument Sans | Google Fonts typography |

### Database Schema (Supabase)
| Table | Purpose |
|---|---|
| `users` | Accounts — email, hashed password, first/last name, verified flag |
| `verification_codes` | 6-digit email codes with 15-minute expiry, one per user |
| `documents` | Uploaded file metadata — filename, char count, chunk count |
| `document_chunks` | Text chunks with 1536-dim vector embeddings for RAG |
| `threads` | Chat sessions linked to a document and user |
| `messages` | Individual chat messages with role (user/assistant) |

---

## 📁 Project Structure

```
docsychat_v4_1/
├── backend/
│   ├── middleware/
│   │   └── auth.js               # JWT auth middleware — protects all non-auth routes
│   ├── routes/
│   │   ├── auth.js               # Signup, login, verify email, resend code, /me
│   │   ├── chat.js               # Send message, get AI response, load history
│   │   ├── threads.js            # List and delete threads
│   │   └── upload.js             # File upload, text extraction, background embedding
│   ├── utils/
│   │   ├── ai.js                 # Gemini / OpenAI chat abstraction
│   │   ├── email.js              # Nodemailer — sends branded verification emails
│   │   ├── extractor.js          # PDF / DOCX / TXT text extraction + cleanup
│   │   ├── rag.js                # Chunking, embedding, adaptive retrieval
│   │   └── supabase.js           # Supabase client initialisation
│   ├── .env                      # Environment variables (see setup section)
│   ├── package.json
│   └── server.js                 # Express app — middleware, routes, server start
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   ├── AuthScreen.jsx    # Login, Signup, and Email Verification screens
│       │   ├── ChatLayout.jsx    # Main app shell — manages threads and view state
│       │   ├── ChatWindow.jsx    # Message list, input bar, welcome message
│       │   ├── Sidebar.jsx       # Thread list, user info, logout button
│       │   └── UploadZone.jsx    # Drag-and-drop or click-to-browse file upload
│       ├── styles/
│       │   ├── app.css           # All component styles
│       │   └── globals.css       # CSS variables, resets, typography imports
│       ├── utils/
│       │   └── api.js            # Axios instance + every API call as named exports
│       ├── App.js                # Root — token validation on load, auth/app routing
│       └── index.js
├── SUPABASE_SETUP.sql            # Full DB setup — run once for a fresh install
├── SUPABASE_MIGRATION_v3.1.sql   # Migration script — run only if upgrading from v3.0
├── CHANGELOG.md
└── README.md
```

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18 or higher
- A [Supabase](https://supabase.com) account with a project created
- A Google Gemini API key — free at [aistudio.google.com](https://aistudio.google.com/app/apikey)
- A Gmail account with a Gmail App Password configured for sending emails

---

### Step 1 — Set up the Supabase database

1. Open your Supabase project (create a new project if needed) → **SQL Editor**
2. Enable pgvector (required for RAG) by running: `create extension if not exists vector;`
3. Copy the entire contents of `SUPABASE_SETUP.sql` and paste it in
4. Click **Run**

This creates all 6 tables, performance indexes, and the `match_chunks` vector similarity function. You only need to do this once.

> **Note:** If you encounter an embeddings-related error after setup, run `SUPABASE_MIGRATION_v3.1.sql` in the SQL Editor as well.

---

### Step 2 — Configure environment variables (.env)

Open `backend/.env` and fill in your values:

```env
# AI Provider — "gemini" (default) or "openai"
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here   # only needed if using OpenAI

# Supabase — from Dashboard → Settings → API
SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_DB_PASSWORD=your_supabase_db_password

# JWT — use any long random string, change in production
JWT_SECRET=some_long_random_secret_here
JWT_EXPIRES_IN=7d

# Email — Gmail SMTP
EMAIL_FROM=your_gmail@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   # 16-char Gmail App Password

# Server
PORT=5000
MAX_FILE_SIZE_MB=10

# RAG tuning
RAG_TOP_K=10
RAG_CHUNK_SIZE=1000
RAG_CHUNK_OVERLAP=100
RAG_MIN_SIMILARITY=0.35
```

**For Gemini API Key:**
1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with Google
3. Click **"Create API Key"**
4. Copy the key

**Supabase credentials:** Supabase Dashboard → Settings → API → copy Project URL and the `anon public` key.

**Gmail App Password:** Google Account → Security → 2-Step Verification must be ON → App Passwords → create one with any name (e.g. "DocsyChat") → copy the 16-character password shown.

---

### Step 3 — Install and run

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (http://localhost:3000)
cd frontend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

---

## 💡 How it Works

### First Use

1. Click **Sign up** on the login screen
2. Enter your first name, last name, email address, and a password (minimum 8 characters)
3. Check your inbox for a 6-digit verification code — it expires in 15 minutes
4. Enter the code on the verification screen — you're logged in automatically
5. Click **New Document Chat** in the sidebar
6. Upload a PDF, DOCX, or TXT file (max 10 MB)
7. The document is embedded in the background — this takes a few seconds depending on document length
8. Ask any question about the document

---

## 💡 How RAG Works

**On upload:**
1. Text is extracted from the file
2. The text is split into sentence-aware chunks (~1,000 characters each with 100-character overlap)
3. Each chunk is embedded using `gemini-embedding-001` (1536 dimensions) and stored in Supabase via pgvector

**On each message — three strategies are used automatically:**

| Situation | Strategy |
|---|---|
| Document has ≤ 25 chunks (short document) | All chunks sent directly — no vector search |
| Summary or overview question on any document | All chunks sent directly — no vector search |
| Long document + specific question | Vector search — top chunks by cosine similarity |

For short documents all chunks are sent on every message. This is faster (skips the embedding API call entirely), more accurate (no retrieval misses), and the total content is small enough to fit easily in the model's context window.

For long documents, vector search retrieves the most relevant 15% of chunks (minimum 4, maximum 10) and applies a similarity threshold to filter out low-relevance results.

---

## 📂 Supported File Types

| Format | Extension | Notes |
|---|---|---|
| PDF | `.pdf` | Text-based PDFs only — scanned/image PDFs are not supported |
| Word Document | `.docx` | Raw text extracted; formatting is ignored |
| Plain Text | `.txt` | UTF-8 encoding |

Maximum file size: **10 MB**

---

## 🔌 API Reference

### Auth — `/api/auth`
| Method | Route | Auth required | Description |
|---|---|---|---|
| POST | `/signup` | No | Create account, triggers verification email |
| POST | `/verify` | No | Submit 6-digit code, returns JWT on success |
| POST | `/resend` | No | Resend verification code |
| POST | `/login` | No | Login with email + password, returns JWT |
| GET | `/me` | Yes | Return current user info from token |

### Upload — `/api/upload`
| Method | Route | Auth required | Description |
|---|---|---|---|
| POST | `/` | Yes | Upload document; creates thread, triggers background embedding |

### Threads — `/api/threads`
| Method | Route | Auth required | Description |
|---|---|---|---|
| GET | `/` | Yes | List all threads for the logged-in user |
| DELETE | `/:threadId` | Yes | Delete thread, messages, chunks, and document |

### Chat — `/api/chat`
| Method | Route | Auth required | Description |
|---|---|---|---|
| POST | `/:threadId` | Yes | Send a message, returns AI response |
| GET | `/:threadId/messages` | Yes | Load full message history for a thread |

All protected routes require the header: `Authorization: Bearer <token>`

---

## 🔄 Switching to OpenAI

Set `AI_PROVIDER=openai` in `.env` and provide your `OPENAI_API_KEY`. The chat model switches to `gpt-3.5-turbo`. The RAG embedding pipeline always uses Gemini regardless of this setting.

---

## 🔑 Credentials Reference

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — free |
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon/public key |
| `SUPABASE_DB_PASSWORD` | Password you set when creating the Supabase project |
| `EMAIL_APP_PASSWORD` | Google Account → Security → 2-Step Verification → App Passwords |
| `JWT_SECRET` | Any long random string — generate one at [randomkeygen.com](https://randomkeygen.com) |
