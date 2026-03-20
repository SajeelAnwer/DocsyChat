# 📄 DocsyChat v4.5 — AI Document Q&A Chatbot

A full-stack AI-powered document Q&A chatbot. Upload a PDF, DOCX, or TXT file and ask questions about it — DocsyChat answers from the document's content using Retrieval-Augmented Generation (RAG). Summarize it, ask specific questions, or dig into details — all grounded in what's actually in the file.

---

## ✨ Features

- **Document Q&A** — upload a document and get answers grounded in its content
- **Adaptive RAG pipeline** — automatically selects the best retrieval strategy based on document size; small documents skip vector search entirely for faster and more accurate responses
- **Summary detection** — asking for a summary or overview sends the full document to the model instead of running vector search
- **Case-robust retrieval** — query expansion ensures results are consistent regardless of how you capitalize your question
- **Thinking indicator** — while DocsyChat is processing, a status message shows what it's doing. After it responds, a small label shows how long it took
- **Copy button** — every message has a copy button next to the timestamp. Hover to see "Copy prompt" or "Copy response", click to copy. Confirms with a checkmark
- **Star chats** — star any thread to pin it to the top of the sidebar. A resting star is visible at rest; hovering reveals the full action row
- **Rename threads** — click the rename button on any thread to give it a custom name inline. Press Enter to save or Escape to cancel
- **Search chats** — a persistent search box in the sidebar filters threads in real time by chat name or document filename. Clicking outside or pressing Escape clears it
- **Forgot password** — email-based password reset with a 6-digit code, same flow as signup verification
- **Account management** — a three-dot menu at the bottom of the sidebar provides Sign out and Delete account options. Deleting an account permanently removes all data
- **API quota error handling** — when the Gemini API quota is hit, DocsyChat shows a clear banner telling the user whether to wait a minute (rate limit) or try again tomorrow (daily quota)
- **Auto-focus input** — the message box becomes active automatically after every response
- **Smart timestamps** — messages show a context-aware date and time. Thread timestamps reflect the last message, not when the chat was created
- **Email authentication** — signup with email and password, verified via a 6-digit code sent to your inbox
- **Persistent storage** — all users, documents, threads, and messages stored in Supabase PostgreSQL
- **Conversation history** — chat threads persist across sessions with full message history
- **Multi-provider AI** — defaults to Google Gemini, configurable to OpenAI
- **Clean white UI** — Fraunces + Instrument Sans typography, purple accent, dark sidebar

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
| Nodemailer + Gmail SMTP | Verification and password reset email delivery |
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
| Fraunces + Instrument Sans | Google Fonts typography |

### Database Schema (Supabase)
| Table | Purpose |
|---|---|
| `users` | Accounts — email, hashed password, first/last name, verified flag |
| `verification_codes` | 6-digit email codes with 15-minute expiry — used for signup and password reset |
| `documents` | Uploaded file metadata — filename, char count, chunk count |
| `document_chunks` | Text chunks with 1536-dim vector embeddings for RAG |
| `threads` | Chat sessions linked to a document and user |
| `messages` | Individual chat messages with role (user/assistant) |

---

## 📁 Project Structure

```
DocsyChat_v4.5/
├── backend/
│   ├── middleware/
│   │   └── auth.js               # JWT auth middleware — protects all non-auth routes
│   ├── routes/
│   │   ├── auth.js               # Signup, login, verify, resend, forgot/reset password, /me, delete account
│   │   ├── chat.js               # Send message, get AI response, load history
│   │   ├── threads.js            # List, patch (rename/star), and delete threads
│   │   └── upload.js             # File upload, text extraction, background embedding
│   ├── utils/
│   │   ├── ai.js                 # Gemini / OpenAI chat abstraction with quota error detection
│   │   ├── email.js              # Nodemailer — verification and password reset emails
│   │   ├── extractor.js          # PDF / DOCX / TXT text extraction + cleanup
│   │   ├── rag.js                # Chunking, embedding, adaptive retrieval, QuotaError class
│   │   └── supabase.js           # Supabase client initialisation
│   ├── .env.example              # Environment variable template — copy to .env and fill in
│   ├── package.json
│   └── server.js                 # Express app — middleware, routes, server start
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   ├── AuthScreen.jsx    # Login, Signup, Verify, Forgot Password, Reset Password
│       │   ├── ChatLayout.jsx    # Main app shell — manages threads and view state
│       │   ├── ChatWindow.jsx    # Message list, input bar, thinking indicator, error banners
│       │   ├── Sidebar.jsx       # Thread list, search, three-dot menu, user info
│       │   └── UploadZone.jsx    # Drag-and-drop or click-to-browse file upload
│       ├── styles/
│       │   ├── app.css           # All component styles
│       │   └── globals.css       # CSS variables, resets, typography, keyframes
│       ├── utils/
│       │   └── api.js            # Axios instance + every API call as named exports
│       ├── App.js                # Root — token validation on load, auth/app routing
│       └── index.js
├── SUPABASE_SETUP.sql            # Full DB setup — run once for a fresh install
├── SUPABASE_MIGRATION_v3.1.sql   # Migration — run only if upgrading from v3.0
├── SUPABASE_MIGRATION_v4.4.sql   # Migration — run only if upgrading from v4.3.x
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

1. Open your Supabase project → **SQL Editor**
2. Enable pgvector: `create extension if not exists vector;`
3. Copy the entire contents of `SUPABASE_SETUP.sql` and run it

This creates all 6 tables, indexes, and the `match_chunks` vector similarity function. Only needed once.

> **Upgrading from v4.3.x?** Also run `SUPABASE_MIGRATION_v4.4.sql` in the SQL Editor.

---

### Step 2 — Configure environment variables

Copy `backend/.env.example` to `backend/.env` and fill in your values:

```env
# AI Provider — "gemini" (default) or "openai"
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Supabase — from Dashboard → Settings → API
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_DB_PASSWORD=your_supabase_db_password

# JWT — use a long random string, keep it secret
JWT_SECRET=replace_with_a_long_random_string_at_least_32_chars
JWT_EXPIRES_IN=7d

# Email — Gmail SMTP
EMAIL_FROM=your_gmail@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Server
PORT=5000
MAX_FILE_SIZE_MB=10

# RAG tuning
RAG_TOP_K=10
RAG_CHUNK_SIZE=1000
RAG_CHUNK_OVERLAP=100
RAG_MIN_SIMILARITY=0.35
```

**Gemini API Key:** [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) → Create API Key

**Supabase credentials:** Supabase Dashboard → Settings → API → Project URL + anon public key

**Gmail App Password:** Google Account → Security → 2-Step Verification ON → App Passwords → create one for DocsyChat

**JWT Secret:** Generate a strong random string at [randomkeygen.com](https://randomkeygen.com)

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
2. Enter your name, email, and a password (minimum 8 characters)
3. Check your inbox for a 6-digit verification code — expires in 15 minutes
4. Enter the code — you're logged in automatically
5. Click **New Document Chat** in the sidebar
6. Upload a PDF, DOCX, or TXT file (max 10 MB)
7. The document is embedded in the background — takes a few seconds
8. Ask any question about the document

---

## 💡 How RAG Works

**On upload:**
1. Text is extracted from the file
2. Split into sentence-aware chunks (~1,000 characters each, 100-character overlap)
3. Each chunk is embedded using `gemini-embedding-001` (1536 dimensions) and stored in Supabase via pgvector

**On each message — three strategies used automatically:**

| Situation | Strategy |
|---|---|
| Document has ≤ 25 chunks | All chunks sent directly — no vector search |
| Summary or overview question | All chunks sent directly — no vector search |
| Large document + specific question | Vector search — top chunks by cosine similarity |

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
| POST | `/signup` | No | Create account, sends verification email |
| POST | `/verify` | No | Submit 6-digit code, returns JWT |
| POST | `/resend` | No | Resend verification code |
| POST | `/login` | No | Login, returns JWT |
| GET | `/me` | Yes | Return current user info from token |
| POST | `/forgot-password` | No | Send 6-digit password reset code to email |
| POST | `/verify-reset-code` | No | Verify reset code, returns short-lived reset token |
| POST | `/reset-password` | No | Set new password using reset token |
| DELETE | `/account` | Yes | Permanently delete account and all data |

### Upload — `/api/upload`
| Method | Route | Auth required | Description |
|---|---|---|---|
| POST | `/` | Yes | Upload document, creates thread, triggers background embedding |

### Threads — `/api/threads`
| Method | Route | Auth required | Description |
|---|---|---|---|
| GET | `/` | Yes | List all threads, sorted starred-first then by last activity |
| PATCH | `/:threadId` | Yes | Rename or star/unstar a thread |
| DELETE | `/:threadId` | Yes | Delete thread, messages, and document data |

### Chat — `/api/chat`
| Method | Route | Auth required | Description |
|---|---|---|---|
| POST | `/:threadId` | Yes | Send a message, returns AI response |
| GET | `/:threadId/messages` | Yes | Load full message history for a thread |

All protected routes require: `Authorization: Bearer <token>`

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
| `SUPABASE_DB_PASSWORD` | Password set when creating the Supabase project |
| `EMAIL_APP_PASSWORD` | Google Account → Security → 2-Step Verification → App Passwords |
| `JWT_SECRET` | Any long random string — generate at [randomkeygen.com](https://randomkeygen.com) |
