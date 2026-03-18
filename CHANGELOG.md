# DocsyChat — Changelog

---

## v4.4 — Star & Rename Threads

**Previous version (v4.3.2)** replaced the ✕ delete button with a Gemini-style bin icon and added an instant custom tooltip.

---

### What changed in v4.4 (plain language)

**Star threads**
- You can now star any thread in the sidebar. Starred threads float to the top of the list. Click the star again to unstar.
- When a starred thread is not hovered, a small filled star is visible at the far right of the thread item. When you hover the thread, that resting star slides off to the right and fades out as the full action row (star, rename, delete) slides into view.
- The star button in the action row uses the same muted white/gray color as the rename and delete icons — no yellow.

**Rename threads**
- Click the pencil icon on any thread to rename it. The thread title turns into an inline text input. Press Enter to save or Escape to cancel. Blur also saves.
- The original document filename is preserved in the database even after renaming. If you clear a custom name, the thread reverts to the filename.

**Unified action buttons**
- The three action buttons — star, rename, delete — appear together on hover, consistently spaced. They use the same instant tooltip pattern as the copy button.

**Thread re-ordering on activity**
- Sending a message now moves the thread up to the most recent position in its group. Starred threads stay pinned above unstarred ones, but within each group the order is updated by last activity immediately — no page reload needed.

**Sidebar label**
- The "RECENT" label above the thread list has been renamed to "Your Chats".


- Long document filenames no longer bleed under the action buttons. The title reserves padding for the resting star at rest, and for the full action row on hover, so text always truncates cleanly with an ellipsis before any buttons.

**Last-activity timestamp**
- The timestamp shown under each thread title now reflects the last message in that chat, not when the thread was created. Sending a new message updates the timestamp immediately.

---

### Technical details

**Database changes**

Two new columns added to the `threads` table:
- `custom_title text` — stores the user-defined name. `null` means the thread is using the default (document filename).
- `is_starred boolean default false` — starred state.

A new index `idx_threads_starred` on `(user_id, is_starred)` supports the sorted query. A migration file `SUPABASE_MIGRATION_v4.4.sql` is included for existing installs.

**Backend — `backend/routes/threads.js`**

- `GET /api/threads` — now fetches the latest message `created_at` for each thread in parallel and returns it as `last_message_at`. Falls back to `thread.created_at` if the thread has no messages yet.
- `PATCH /api/threads/:threadId` — new endpoint. Accepts `{ custom_title }` for rename or `{ is_starred }` for star toggle, or both. Updates only the provided fields. Response includes `last_message_at`.
- `GET /api/threads` response includes `custom_title`, `is_starred`, `last_message_at`, sorted starred-first then by `created_at` descending.

**Frontend API — `frontend/src/utils/api.js`**

Added `renameThread(threadId, custom_title)` and `starThread(threadId, is_starred)` — both call `PATCH /api/threads/:threadId`.

**`ChatLayout.jsx`**

- `normalizeThread` updated to compute `displayTitle = custom_title || file_name` and carry `last_message_at`.
- `handleRenameThread` — optimistic update using `custom_title`; reloads from server on failure.
- `handleStarThread` — optimistic update toggles `is_starred` and re-sorts threads in state (starred first) without a server round trip; reloads on failure.
- `handleMessageSent(threadId)` — new callback. Updates `last_message_at` to `now` in local thread state immediately after a successful AI response. Passed to `ChatWindow` as `onMessageSent`.

**`ChatWindow.jsx`**

- Accepts `onMessageSent` prop. Calls it with `thread.id` after each successful AI response so the sidebar timestamp updates without a reload.

**`Sidebar.jsx`**

- Replaced the single delete button with a `thread-item__actions` row containing three `ThreadAction` components (star, rename, delete). All three are hidden by default and appear on hover.
- `ThreadAction` — reusable wrapper providing the instant tooltip pattern.
- `RenameInput` — inline input rendered inside the thread item when editing. Auto-focuses and selects all text on mount. Enter saves, Escape cancels, blur saves.
- `StarFilledIcon` / `StarEmptyIcon` — filled and outline star SVGs. `RenameIcon` — pencil SVG.
- Resting star: `{thread.is_starred && <span className="thread-item__star-resting">★</span>}` rendered as a sibling to the title, hidden during rename editing.
- Thread timestamp uses `thread.last_message_at || thread.created_at`.

**CSS — `frontend/src/styles/app.css`**

- `.thread-item__title` — adds `padding-right: 18px` at rest (reserves space for the resting star) and `padding-right: 74px` on hover (reserves space for the full 3-button action row). Transition on `padding-right` keeps the text reflow smooth.
- `.thread-item__actions` — flex row, absolutely positioned right, `opacity: 0` until hover.
- `.thread-action-wrap` / `.thread-action-btn` — shared base styles for all three buttons.
- `.thread-action-wrap.delete` — red on hover.
- `.thread-action-tooltip` — instant tooltip, same `opacity 0.1s` pattern as the copy button.
- `.thread-item__star-resting` — `★` glyph at `right: 6px`, `font-size: 13px` (matches SVG icon size), `rgba(255,255,255,0.55)`. On hover: slides to `right: -14px` and `opacity: 0` via `cubic-bezier(0.4,0,0.2,1)` transition.
- `.thread-item__rename-input` — inline input styled to match the dark sidebar.

---

### Files changed

| File | What changed |
|---|---|
| `backend/routes/threads.js` | Added `PATCH /:threadId`; `GET /` now fetches and returns `last_message_at`, `custom_title`, `is_starred`, sorted starred first |
| `frontend/src/utils/api.js` | Added `renameThread`, `starThread` |
| `frontend/src/components/ChatLayout.jsx` | Added `handleRenameThread`, `handleStarThread`, `handleMessageSent` (with re-sort); updated `normalizeThread` |
| `frontend/src/components/ChatWindow.jsx` | Accepts and calls `onMessageSent` after each successful AI response |
| `frontend/src/components/Sidebar.jsx` | Full rewrite of thread actions; resting star; last-activity timestamp; "Recent" → "Your Chats" |
| `frontend/src/styles/app.css` | Unified thread action system; title padding-right fix; resting star styles |
| `SUPABASE_SETUP.sql` | Added `custom_title`, `is_starred` columns and `idx_threads_starred` index |
| `SUPABASE_MIGRATION_v4.4.sql` | **New file** — run if upgrading from v4.3.x |
| `backend/server.js` | Version updated to v4.4 |
| `backend/package.json` | Version updated to 4.4.0 |
| `frontend/package.json` | Version updated to 4.4.0 |
| `README.md` | Version updated to v4.4; project structure updated |
