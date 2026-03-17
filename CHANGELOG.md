# DocsyChat — Changelog

---

## v4.3.1 — Copy Button & Timestamp Improvements

**Previous version (v4.3.0)** added the thinking indicator — rotating status phrases while the AI works and a "Searched document · Ns" label after each response.

---

### What changed in v4.3.1 (plain language)

- Every message now has a copy button sitting next to the timestamp. It is always visible — no hovering needed to find it. When you hover over it, a tooltip instantly appears saying "Copy prompt" (for your question) or "Copy response" (for DocsyChat's answer). Click it and the text is copied to your clipboard. The icon briefly turns into a checkmark to confirm it worked.
- Message timestamps now use 12-hour AM/PM format instead of 24-hour.
- Today's messages now show "Today · 2:45 PM" instead of just the time, so it is always clear when a message was sent.

---

### Technical details

**Copy button always visible (`frontend/src/styles/app.css`)**

Removed `opacity: 0` and the `message:hover` fade-in from `.message__footer`. The footer and copy button are now always visible.

**Custom tooltip instead of browser `title` attribute (`frontend/src/components/ChatWindow.jsx`, `frontend/src/styles/app.css`)**

The browser's native `title` tooltip has a built-in ~500ms delay before it appears — this cannot be changed with CSS. Replaced it with a custom `.copy-btn-tooltip` span positioned absolutely above the button, hidden by default (`opacity: 0`) and shown instantly on `.copy-btn-wrap:hover` (`opacity: 1`, `transition: 0.1s`). The result is a tooltip that appears as fast as any hover state.

**Copy button order and spacing (`frontend/src/components/ChatWindow.jsx`, `frontend/src/styles/app.css`)**

The copy button now comes before the timestamp in the DOM. `.message__footer` uses `gap: 6px` instead of `justify-content: space-between`, so the button and timestamp sit close together rather than pushed to opposite ends.

**Gemini-style copy icon (`frontend/src/components/ChatWindow.jsx`)**

Replaced the previous two-rectangle clipboard SVG with a cleaner version: a square on top (`rect x="8" y="8"`) and an L-shaped path for the back sheet, using thinner `strokeWidth="1.8"` strokes. This matches the minimal flat icon style used in Gemini's interface.

**Timestamp format (`frontend/src/components/ChatWindow.jsx`)**

- Added `hour12: true` to `toLocaleTimeString` options — all times now show as `2:45 PM` instead of `14:45`.
- Changed the today condition from returning just `time` to returning `` `Today · ${time}` ``.

---

### Files changed

| File | What changed |
|---|---|
| `frontend/src/components/ChatWindow.jsx` | Custom tooltip wrapper; Gemini-style SVG icon; copy button before timestamp; `hour12: true`; "Today ·" prefix |
| `frontend/src/styles/app.css` | Removed hover-only visibility; added `.copy-btn-wrap` and `.copy-btn-tooltip`; `gap` instead of `space-between` |
