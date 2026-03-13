# 📄 DocuChat — AI Document Q&A Chatbot

A full-stack AI chatbot that answers questions **only** based on documents you upload. Built with React + Node.js/Express, powered by Google Gemini (free) or OpenAI.

---

## 🛠 Tech Stack

| Layer     | Tech                              |
|-----------|-----------------------------------|
| Frontend  | React 18, CSS Variables           |
| Backend   | Node.js, Express                  |
| AI        | Google Gemini 1.5 Flash (free) or OpenAI GPT-3.5 |
| File Parsing | pdf-parse, mammoth (docx)      |
| Storage   | In-memory (no DB needed for demo) |

---

## 🚀 Setup & Run

### Step 1 — Get a Free Gemini API Key

1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with Google
3. Click **"Create API Key"**
4. Copy the key

### Step 2 — Configure the backend

Open `backend/.env` and add your key:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=paste_your_key_here
```

> **Using OpenAI instead?** Set `AI_PROVIDER=openai` and add `OPENAI_API_KEY=your_key`.

### Step 3 — Install dependencies

Open **two terminals**:

**Terminal 1 (Backend):**
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm start
# Opens http://localhost:3000
```

### Step 4 — Open the app

Visit **http://localhost:3000**

---

## 💡 How It Works

1. Enter your first and last name (no signup needed)
2. Upload a PDF, DOCX, or TXT file
3. The backend extracts all text from the document
4. The AI is given your document and instructed to **only answer questions about it**
5. Ask questions — if it's in the document, you'll get an answer. If not, the AI says so.

---

## 📁 Project Structure

```
docuchat/
├── backend/
│   ├── routes/
│   │   ├── upload.js      # File upload & text extraction
│   │   ├── chat.js        # AI chat endpoint
│   │   └── threads.js     # Thread management
│   ├── utils/
│   │   ├── ai.js          # Gemini & OpenAI abstraction
│   │   ├── extractor.js   # PDF/DOCX/TXT text extraction
│   │   └── store.js       # In-memory data store
│   ├── server.js          # Express app entry point
│   └── .env               # ← PUT YOUR API KEY HERE
│
└── frontend/
    └── src/
        ├── components/
        │   ├── WelcomeScreen.jsx   # Name entry screen
        │   ├── ChatLayout.jsx      # Main app shell
        │   ├── Sidebar.jsx         # Thread list
        │   ├── ChatWindow.jsx      # Message interface
        │   └── UploadZone.jsx      # File drag & drop
        ├── utils/api.js            # API calls
        └── styles/                 # CSS
```

---

## 🔄 Switching AI Providers

In `backend/.env`:
```env
# For Gemini (free)
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key

# For OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=your_key
```

---

## 🚢 Deploying

When ready to deploy:
- **Backend**: Deploy to Railway, Render, or Fly.io (add env vars in dashboard)
- **Frontend**: Deploy to Vercel or Netlify (update `proxy` in package.json to backend URL)
- **Data persistence**: Replace `utils/store.js` with a real database (PostgreSQL recommended)

---

## ⚠️ Notes

- Data is **in-memory only** — threads are lost on server restart (by design for demo)
- Max file size: 10MB
- Large documents are truncated to ~30,000 characters to fit AI context limits
- Rate limited to 100 requests per 15 minutes
