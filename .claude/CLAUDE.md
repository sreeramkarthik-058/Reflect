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

## Build Phases

### Phase 1 — Foundation `COMPLETE` (F01–F05, F09, F10, F16–F19)
- Auth flow: signup, login, logout, session persistence via Supabase (`sb_publishable_` key on frontend)
- Today screen: rotating prompts, auto-growing textarea, save flow, streak/total stats strip
- History screen: collapsed entry pills, expand/collapse, inline edit, delete, search with match highlighting
- Supabase: `entries` table with RLS; explicit `GRANT` to `authenticated`, `anon`, `service_role`

### Phase 2 — AI Heart `COMPLETE` (F11–F15)
- Every entry triggers a Claude Haiku response via backend (`server/routes/entries.js`)
- Save flow: frontend → `POST /api/entries` → Supabase insert (service role) → Claude call → `ai_response` patched on row → full entry returned
- Done state UX: entry text + AI response shown together; "Write another entry" returns to form
- Model config: `config/models.js` (`claude-haiku-4-5-20251001`); never hardcoded elsewhere
- Keys: `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in root `.env` only

### Phase 3 — Admin Portal `COMPLETE` (F29–F35, F37)
- Admin login at `/admin`: credentials verified server-side, `user_roles` checked for `role = 'admin'`
- Session stored in `sessionStorage` as JWT; verified on every protected route via `requireAdmin` middleware
- Dashboard: Users tab (list, status badges, disable/deactivate/reactivate, notes panel) and Activity tab (logs filterable by user, event type, date range)
- Backend: `server/routes/admin.js` mounted at `/api/admin`; two Supabase clients (service role for DB, publishable for sign-in)
- DB: `status` column added to `user_roles` (active / disabled / deactivated)

### Phase 4 — Product Metrics `COMPLETE` (F36, F38)
- `tokens_used` column on `entries` (input + output tokens as integer); cost computed at display time
- `GET /api/admin/metrics`: parallel fetch of users + entries, derives total_users, DAU, entries/day (7d), voice/text split, streak distribution, retention cohorts (this week / last week / last month)
- `GET /api/admin/ai-costs`: last 30 days tokens grouped by day, today/week/month/projected totals using 75/25 input/output split at Haiku pricing ($0.80/$4.00 per M)
- Admin dashboard: Metrics tab with `MetricCard` components, horizontal bar charts, streak 2×2 grid, retention cohort table, per-day cost table with usage bars

### Phase 5 — Full Today Screen `COMPLETE` (F06, F07, F08, F20–F24)
- Voice entry via Web Speech API (`recognition.continuous`, `lang: 'en-IN'`); mic button pulses red while listening; transcript appends to textarea; `input_type: 'voice'` saved on entry
- Image upload placeholder: disabled "Photo" button with "Coming soon" tooltip; no backend wired
- Mood: 5 pill buttons (Happy/Grateful/Neutral/Stressed/Anxious) below textarea; selected pill highlights gold; `mood` column on `entries` (nullable text with check constraint); emoji shown in done state card and History pill headers
- F23 done state: on mount, if today's entry exists, loads content + ai_response + mood directly into done state — blank form only shown if nothing written yet today
- Stats strip: streak · total entries · most recent mood emoji (when available)
- `entries.js` backend: accepts `mood` and `input_type` from request body, stores both on insert

### Phase 6 — Insights `COMPLETE` (F25–F28)
- Backend: `server/routes/insights.js` mounted at `/api/insights`; `requireUser` middleware via Bearer JWT
- `GET /api/insights/stats` — streak + `mood_series` (one point per day, last 30 days)
- `POST /api/insights/digest` — weekly AI digest; returns `null` if fewer than 3 entries this week
- `POST /api/insights/chat` — Q&A over last 50 entries passed as system context
- `client/src/pages/Insights.jsx` — streak/total cards, SVG mood graph with trend indicator, digest card, Ask My Journal entry point
- `client/src/pages/Ask.jsx` — mobile full-screen chat page
- `client/src/components/BottomNav.jsx` — mobile-only fixed bottom tab bar (Today / History / Insights); hidden on `sm:` and above
- `client/src/components/ChatUI.jsx` — shared chat bubble UI used by Insights drawer and Ask.jsx
- Desktop nav: Today / History / Insights links in top nav across all three pages; hidden on mobile with `hidden sm:flex`
- Mobile: nav links hidden in header; `pb-24 sm:pb-10` on main to clear bottom tab bar

### Phase 7 — Telegram Bot `PENDING` (N01–N06)

### Phase 8 — Deploy `PENDING`
