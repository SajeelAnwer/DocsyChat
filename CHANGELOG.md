# DocsyChat — Changelog

---

## v4.1.1 — Performance Optimizations

**Previous version (v4.1)** overhauled the RAG pipeline with adaptive retrieval strategies — small documents now skip vector search entirely and send all chunks directly, which fixed the topic-confusion issues and improved answer accuracy.

This version focuses entirely on speed. No features added, no RAG changes — just removing unnecessary work that was slowing down every interaction.

---

### Issue In Simple Words: solved in v4.1.1

The App was a bit slow, the loading time of pages was high and the action button took longer (deleting a thread took like 5 to 6 seconds in disapearing from the frontend)

### Problem 1 — Every API request hit the database for auth

The auth middleware was making a Supabase DB call on every single authenticated request to look up the user by ID. This added ~150–200ms to every chat message, every thread load, every delete, and every page load. The DB call wasn't actually necessary — the JWT is cryptographically signed, so verifying it locally is all that's needed to trust it.

**Fix (`backend/middleware/auth.js`):** Removed the Supabase lookup from the middleware entirely. `jwt.verify()` now handles auth on its own. To support this, the JWT payload was updated to carry `email`, `firstName`, and `lastName` so downstream routes have user info without needing a DB call. ~150–200ms saved on every authenticated request.

---

### Problem 2 — App took a noticeable moment to load even when already logged in

On every page load, the app waited for a `/api/auth/me` network round trip to complete before rendering anything. The user saw a spinner while this resolved even though their session was perfectly valid.

**Fix (`frontend/src/App.js`):** User data is now cached in `localStorage` alongside the JWT token. On load, the app reads from cache instantly and renders immediately with no network call. A background request to `/api/auth/me` still runs quietly — if the server rejects the token, the cache is cleared and the user is sent to login. Token expiry is also checked locally by decoding the JWT payload so expired sessions are caught without a round trip.

---

### Problem 3 — Deleting a thread felt slow (5–6 seconds)

The delete flow was fully sequential and blocking: auth middleware DB call → ownership check → delete messages → delete thread → count remaining threads → maybe delete chunks → maybe delete document — all before sending any response. The UI waited for all of this before removing the thread from the sidebar.

**Fix — two parts:**

`backend/routes/threads.js`: Messages and thread are now deleted in parallel with `Promise.all`. The response is sent immediately after that. The document and chunk cleanup happens in the background after the response is already sent — the user never waits for it.

`frontend/src/components/ChatLayout.jsx`: Delete is now optimistic. The thread disappears from the sidebar the moment the button is clicked. The API call fires in the background. If it fails, the thread is restored automatically.

---

### Also fixed — stale version strings

`server.js`, `backend/package.json`, `frontend/package.json`, and `backend/.env` were all still referencing v3 in their version fields and log messages. Updated to v4.1.1.
