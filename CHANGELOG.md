# DocsyChat — Changelog

---

## v4.3.2 — Delete Button Icon & Tooltip

**Previous version (v4.3.1)** added the copy button to every message, fixed the timestamp to 12-hour AM/PM format, and added "Today ·" prefix to today's messages.

---

### What changed in v4.3.2 (plain language)

The delete button on sidebar chat threads has been updated. It was previously a plain ✕ character — it is now a proper bin (trash) icon in the Gemini style. When you hover over it, it turns red. A tooltip saying "Delete" now appears instantly on hover instead of using the browser's slow built-in tooltip delay.

---

### Technical details

**Bin icon (`frontend/src/components/Sidebar.jsx`)**

Replaced the `✕` text character with a `BinIcon` SVG component — an outline trash can with a lid, two vertical lines for the body detail, and a small handle on top. Drawn with `strokeWidth="1.8"` and rounded line caps to match the thin, clean icon style used throughout the app (same as the copy button icon).

**Instant tooltip — same pattern as copy button (`frontend/src/components/Sidebar.jsx`, `frontend/src/styles/app.css`)**

The delete button is now wrapped in a `thread-item__delete-wrap` div, which holds both the button and a `thread-item__delete-tooltip` span. The tooltip is hidden by default (`opacity: 0`) and appears instantly on `.thread-item__delete-wrap:hover` (`transition: opacity 0.1s`). The `title` attribute has been removed entirely — that was the source of the browser's ~500ms delay. The tooltip is anchored to the right edge of the button (`right: 0`) and positioned above it, so it doesn't overflow the sidebar on the right side.

**Red on hover (`frontend/src/styles/app.css`)**

`.thread-item__delete:hover` sets `color: #e87070` — the same red used previously, now applied to the SVG stroke via `currentColor`.

---

### Files changed

| File | What changed |
|---|---|
| `frontend/src/components/Sidebar.jsx` | Added `BinIcon` SVG component; wrapped delete button in `thread-item__delete-wrap`; added `thread-item__delete-tooltip` span; removed `title` attribute |
| `frontend/src/styles/app.css` | Replaced `thread-item__delete` rules with `thread-item__delete-wrap`, updated delete button styles, added `thread-item__delete-tooltip` |
| `backend/server.js` | Version updated to v4.3.2 |
| `backend/package.json` | Version updated to 4.3.2 |
| `frontend/package.json` | Version updated to 4.3.2 |
| `backend/.env` | Header comment updated |
| `SUPABASE_SETUP.sql` | Header comment updated |
| `package.json` (root) | Version updated to 4.3.2 |
