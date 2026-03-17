# DocsyChat — Changelog

---

## v4.3.0 — Thinking Indicator

**Previous version (v4.2)** added auto-focus after responses, smart timestamps, and the document filename as the sidebar thread title.

---

### What changed in v4.3.0 (plain language)

- While DocsyChat is working on your question, instead of three bouncing dots you now see a short text message that describes what it is doing — "Reading your question…", "Searching the document…", "Finding relevant sections…" and so on. The message changes as time passes.
- After DocsyChat replies, a small line appears just above the response saying something like "Searched document · 3s" so you know roughly how long it took.
- These are purely visual changes. No extra API calls are made, nothing changes in how the AI works, and there is no added cost.

---

### Technical details

**Thinking indicator — `ThinkingIndicator` component (`frontend/src/components/ChatWindow.jsx`)**

Replaced the `TypingIndicator` component (three bouncing dots) with a new `ThinkingIndicator` component. It receives the timestamp of when the message was sent (`startTime`) and uses a `setInterval` running every 300ms to compare elapsed time against a `THINKING_PHASES` array:

```
0ms    → "Reading your question…"
1500ms → "Searching the document…"
3500ms → "Finding relevant sections…"
6000ms → "Putting the answer together…"
9000ms → "Almost there…"
```

When the phase changes, the text fades out (opacity 0 over 200ms), the new text is set, then it fades back in. This gives a smooth transition without any animation library. The pulsing accent-coloured dot next to the text uses a `thinkingPulse` CSS keyframe (scale + opacity).

**"Searched document · Ns" label — `ThoughtLabel` component (`frontend/src/components/ChatWindow.jsx`)**

When `handleSend` fires, it records `startTime = Date.now()`. When the response arrives, it calculates `durationMs = Date.now() - startTime` and stores it on the message object alongside the content. The `ThoughtLabel` component reads this value and renders a small muted label above the response bubble. Labels under 500ms are hidden (no flicker for very fast responses). The label reads "Searched document · 1s", "Searched document · 4s", or just "Searched document" for responses over 10 seconds.

**CSS additions (`frontend/src/styles/app.css`)**

Added `.thinking-status`, `.thinking-status__dot`, `.thinking-status__text`, and `.thought-label` styles. The thought label uses a `::before` pseudo-element with the `✦` character to match the DocsyChat avatar.

**Keyframe addition (`frontend/src/styles/globals.css`)**

Added `@keyframes thinkingPulse` — scales the dot between 1 and 0.75 while fading opacity between 1 and 0.35, giving a soft breathing pulse effect.

---

### Files changed

| File | What changed |
|---|---|
| `frontend/src/components/ChatWindow.jsx` | Replaced `TypingIndicator` with `ThinkingIndicator`; added `ThoughtLabel`; added `loadingStartTime` state; passes `durationMs` on message objects |
| `frontend/src/styles/app.css` | Added `.thinking-status`, `.thinking-status__dot`, `.thinking-status__text`, `.thought-label` styles |
| `frontend/src/styles/globals.css` | Added `@keyframes thinkingPulse` |
| `backend/server.js` | Version updated to v4.3.0 |
| `backend/package.json` | Version updated to 4.3.0 |
| `frontend/package.json` | Version updated to 4.3.0 |
| `backend/.env` | Header comment updated |
| `SUPABASE_SETUP.sql` | Header comment updated |
| `package.json` (root) | Version updated to 4.3.0 |
