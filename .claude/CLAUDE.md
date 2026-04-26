# Reflect — Project Memory

## What It Is
AI-powered journaling app targeting the 18–45 Indian demographic. Designed to feel like a thoughtful companion, not a productivity tool.

## Tech Stack
- **Frontend:** React + Tailwind CSS
- **Backend:** Node.js + Express
- **Auth & Database:** Supabase
- **AI:** Claude API (Haiku) — all model names must live in `config/models.js`. Never hardcode model names anywhere else.

## Design System (Dark Mode Only — No Exceptions)

| Token | Value |
|---|---|
| Background | `#0C0C0C` |
| Surface | `#141414` |
| Elevated | `#1C1C1C` |
| Border | `#2A2520` |
| Text | `#F5F0E8` |
| Secondary Text | `#A09A8E` |
| Muted | `#5C5650` |
| Accent Gold | `#D4A96A` |
| Success | `#6BAE8A` |
| Error | `#C96A6A` |

## Typography
All fonts loaded from Google Fonts.

| Role | Font |
|---|---|
| Headings | DM Serif Display |
| Body / UI | Sora (weights: 300, 400, 500, 600) |
| Timestamps / IDs | JetBrains Mono |

## AI Personality
- Witty, warm, self-deprecating
- Never preachy
- Forbidden phrases: "I hear you", "That must be hard", "Thank you for sharing"
- Responses: 3–5 lines
- Humour steps back when entry signals genuine distress

## Accessibility
- WCAG AA minimum
- All interactive elements keyboard navigable
- Gold focus outlines (`#D4A96A`)
- Semantic HTML throughout
- ARIA labels on all icon-only buttons

## What's Been Built

### Phase 1 — Core Auth & Text Journaling (COMPLETE)
- **Auth flow:** Signup, login, logout, session persistence via Supabase (`sb_publishable_` key on frontend)
- **Today screen** (`client/src/pages/Today.jsx`): rotating prompts, auto-growing textarea, save flow, streak/total stats strip, History nav link
- **History screen** (`client/src/pages/History.jsx`): collapsed entry pills, expand/collapse, inline edit, delete, client-side search with match highlighting
- **Supabase schema:** `entries` table with RLS enabled; explicit `GRANT` to `authenticated`, `anon`, and `service_role` Postgres roles required

### Phase 2 — AI Response Layer (COMPLETE)
- **Backend:** Express server on port 3001 (`server/index.js`, `server/routes/entries.js`)
- **Save flow:** frontend POSTs to `POST /api/entries` → backend inserts via service role key (bypasses RLS) → calls Claude Haiku → patches `ai_response` on the row → returns full entry
- **AI column:** `ai_response text` (nullable) added to `entries` table
- **Key separation:** `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` live in root `.env`, never exposed to frontend
- **Model config:** all model names in `config/models.js` (`claude-haiku-4-5-20251001`); never hardcoded elsewhere
- **Done state UX:** after save, form hides and shows the written entry + AI response side-by-side; "Write another entry" button returns to form

## Phase 1 Scope (COMPLETE)
Features F01–F05, F09, F10, F16–F19:
- F01: Signup
- F02: Login
- F03: Logout
- F04: Session persistence
- F05: Text entry
- F09: Input type logged
- F10: Timestamp on entry
- F16: Entry history
- F17: Collapsed entry pills
- F18: Edit entry
- F19: Search entries

Not in Phase 1: voice input, mood tags, AI responses.

## Phase 2 Scope (COMPLETE)
- AI response layer wired to every text entry save
- Backend Express server handling insert + Claude call
- `ai_response` column on `entries` table
