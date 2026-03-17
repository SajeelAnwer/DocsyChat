# DocsyChat — Changelog

---

## v4.2 — UI & UX Improvements

### What changed in v4.2 (plain language)

- After DocsyChat replies, the message box automatically becomes active so you can keep typing without having to click it first
- Message timestamps now show a date alongside the time — today's messages still just show the time, but older ones show the date too
- The sidebar now shows the document filename (e.g. `report.pdf`) as the thread title instead of an auto-generated sentence from your first question

---

### What changed from v3.2 to v4.2

v3.2 was the base — a working full-stack app with auth, Supabase database, and a RAG pipeline.

| Version | What changed |
|---|---|
| **v4.0** | RAG improvements — fixed case-sensitive retrieval misses, added summary detection, rewrote system prompt to reduce wrong refusals |
| **v4.1** | RAG optimisation — small documents now skip vector search entirely, faster and more accurate |
| **v4.1.1** | Performance — eliminated a DB call on every request, instant app load from cache, thread delete is now instant |
| **v4.1.2** | Bug fix — upload box was opening the file picker twice; also changed the upload icon to a plus sign |
| **v4.2** | UI improvements — input auto-focuses after responses, smart timestamps, sidebar shows document filename |

---

### Technical details — v4.2 changes

**Change 1 — Auto-focus input after response (`frontend/src/components/ChatWindow.jsx`)**

Added a `useEffect` that watches the `loading` state. When it flips from `true` to `false` — meaning the AI response just finished — it calls `textareaRef.current?.focus()` to programmatically focus the textarea. Also added a height reset on send so the input returns to single-line height after a message is submitted.

**Change 2 — Smart timestamps (`frontend/src/components/ChatWindow.jsx`)**

Replaced `formatTime` with `formatTimestamp`. Logic:
- Today → `2:45 PM`
- Yesterday → `Yesterday · 2:45 PM`
- This year → `14 Mar · 2:45 PM`
- Older → `14 Mar 2024 · 2:45 PM`

**Change 3 — Sidebar shows document filename (`frontend/src/components/Sidebar.jsx`)**

`thread-item__title` now renders `thread.file_name` instead of `thread.title`. The meta row shows only `timeAgo`. Extended `timeAgo` to show a formatted date (e.g. `9 Mar`) for threads older than 7 days instead of `8d ago`.

**Version cleanup**

`package.json` (root) was still named `"docuchat"` at version `"1.0.0"`. `SUPABASE_SETUP.sql`, `backend/.env`, and `server.js` still referenced v4.1.1. All updated to v4.2.

---

### Files changed

| File | What changed |
|---|---|
| `frontend/src/components/ChatWindow.jsx` | Auto-focus on response; smart timestamp |
| `frontend/src/components/Sidebar.jsx` | Filename as title; timeAgo subtitle; extended date for old threads |
| `backend/server.js` | Version updated to v4.2 |
| `backend/package.json` | Version updated to 4.2.0 |
| `frontend/package.json` | Version updated to 4.2.0 |
| `backend/.env` | Header comment updated |
| `SUPABASE_SETUP.sql` | Header comment updated |
| `package.json` (root) | Name corrected to `docsychat`; version updated to 4.2.0 |
