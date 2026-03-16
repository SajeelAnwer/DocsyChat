# DocsyChat — Changelog

---

## v4.1.2 — Upload Zone UI Fix

**Previous version (v4.1.1)** focused on performance — faster app load, faster delete, and eliminating unnecessary database calls on every request.

This version fixes a bug on the upload screen that was causing the file picker to open twice when clicked, and makes a small visual change to the upload button icon.

---

### The problem and the fix (plain language)

On the upload screen, clicking anywhere on the big upload box would open the file chooser window twice — so two file picker dialogs would stack on top of each other, which was confusing and required closing one before you could use the other. This happened because of how click events travel through nested elements on a webpage: clicking the inner icon button triggered the file picker, but that click also travelled upward to the outer box which triggered it a second time. The fix was to stop that click from travelling — the inner elements now handle their own clicks and prevent the outer box from reacting to them as well. The upload icon was also changed from a paperclip emoji to a cleaner plus sign (+).

---

### Technical details

**Double file picker on click (`frontend/src/components/UploadZone.jsx`)**

The upload zone had an `onClick` on the outer box that called `inputRef.current?.click()` to open the file picker. The hidden `<input type="file">` is a child of that box. When `inputRef.current?.click()` was called, the browser fired a click event on the input which bubbled back up to the parent box and triggered `onClick` a second time — opening the file picker twice.

Fix: added `onClick={e => e.stopPropagation()}` on the hidden input so its click event does not bubble up to the parent. The icon also has `e.stopPropagation()` on its own click handler for the same reason.

**Icon change (`frontend/src/components/UploadZone.jsx`)**

Changed the upload icon from `📎` (paperclip emoji) to `+` (plain text plus sign). The icon box is 44×44px with `font-size: 20px` and centered flex layout, so the plus sign renders cleanly without any additional styling.

**Text update (`frontend/src/components/UploadZone.jsx`)**

Updated hint text from "Drag & drop or click 📎 to browse" back to "Click to browse or drag & drop" to match the restored click behaviour on the full upload box.

---

### File changed

| File | What changed |
|---|---|
| `frontend/src/components/UploadZone.jsx` | `stopPropagation` on hidden input and icon; icon changed to `+`; hint text updated |
