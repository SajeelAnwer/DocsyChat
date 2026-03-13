

## 🎨 What Changed in v2 (UI Redesign)

### Theme & Colors
- Switched from dark amber theme to a **warm cream light theme** (`#f5f0e8` base)
- Deep ink dark sidebar (`#1a1814`) for contrast
- Accent color changed to **purple `#7950B0`** used consistently across buttons, avatars, active states, and focus rings

### Typography
- **Fraunces** — optical-size serif for headings, logo, and display text (editorial feel)
- **Instrument Sans** — clean geometric sans-serif for all body text and UI

### Layout
- Chat messages now **constrained to 720px max-width** and centered — no horizontal stretching on wide screens
- Sidebar slimmed to 260px with cleaner spacing

### Sidebar
- **User name moved to bottom-left** of sidebar (like ChatGPT / Claude)
- Top of sidebar is clean: logo + "New Document Chat" button only
- Bottom user section separated by a subtle divider line

### Upload Zone
- Compact horizontal layout: **📎 icon sits to the left** of the text
- Hint text simplified to **"Max 10 MB document"**
- PDF / DOCX / TXT badges sit below, separated by a thin divider

### Other Polish
- Subtle **paper grain texture** overlay on the background
- Smooth `fadeUp` entrance animations on messages and cards
- Bouncing typing indicator dots instead of flat pulsing
- Soft shadow hierarchy — elements have depth without being heavy

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