# Reflect — Project Memory

## What It Is
AI-powered journaling app targeting the 18–45 Indian demographic. Designed to feel like a thoughtful companion, not a productivity tool.

## Tech Stack

### Frontend
- **React** + **React Router v6** — SPA with protected routes
- **Tailwind CSS v4** — CSS-first config, tokens in `@theme` block in `index.css`
- **Vite** — dev server on `localhost:5173`
- **Google Fonts** — DM Serif Display, Sora, JetBrains Mono loaded via `<link>` in `index.html`

### Backend
- **Node.js + Express** — API server on `localhost:3001`
- **`server/index.js`** — entry point; mounts all routers, CORS configured for `localhost:5173`
- **`server/routes/entries.js`** — `POST /api/entries`; insert + Claude call + mood detection
- **`server/routes/insights.js`** — `GET /stats`, `POST /digest`, `POST /chat`; all require Bearer JWT
- **`server/routes/admin.js`** — all `/api/admin/*` routes; two Supabase clients (service role + publishable)

### Config
- **`config/models.js`** — single export `{ journal: 'claude-haiku-4-5-20251001' }`; all Claude model names live here, never hardcoded in routes
- **`config/prompts.js`** — three named exports: `JOURNAL_SYSTEM_PROMPT`, `DIGEST_SYSTEM_PROMPT`, `ASK_SYSTEM_PROMPT`

### Auth & Database
- **Supabase** — auth + Postgres
- Frontend uses `sb_publishable_` key (`VITE_SUPABASE_PUBLISHABLE_KEY`) via `client/src/lib/supabase.js`
- Backend uses `SUPABASE_SERVICE_ROLE_KEY` for all DB writes (bypasses RLS)
- Keys: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in root `.env`; `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL` in `client/.env`

### AI
- **Claude API** (Haiku) via `@anthropic-ai/sdk`
- All calls are server-side only; frontend never touches the Anthropic API

---

## Supabase Schema

### `entries`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `auth.users.id` |
| `content` | text | Entry body |
| `input_type` | text | `'text'` or `'voice'` |
| `mood` | text | `'Happy'`, `'Grateful'`, `'Neutral'`, `'Stressed'`, `'Anxious'` — nullable; check constraint |
| `tokens_used` | integer | input + output tokens combined; nullable |
| `ai_response` | text | Claude's response to the entry; nullable |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Updated on edit |

RLS enabled. Explicit `GRANT SELECT, INSERT, UPDATE, DELETE ON public.entries TO authenticated, anon, service_role`.

### `user_roles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users.id` |
| `role` | text | `'admin'` or `'user'` |
| `status` | text | `'active'`, `'disabled'`, `'deactivated'` |
| `created_at` | timestamptz | |

### `admin_notes`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | The user the note is about |
| `note` | text | Note content |
| `created_by` | uuid | Admin who wrote it |
| `created_at` | timestamptz | |

### `activity_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users.id` |
| `event_type` | text | e.g. `'entry_created'`, `'login'` |
| `metadata` | jsonb | Event-specific payload |
| `created_at` | timestamptz | |

---

## Frontend Routes

| Path | Component | Protected |
|---|---|---|
| `/` | `Landing.jsx` | No |
| `/login` | `Login.jsx` | No |
| `/signup` | `Signup.jsx` | No |
| `/today` | `Today.jsx` | Yes |
| `/history` | `History.jsx` | Yes |
| `/insights` | `Insights.jsx` | Yes |
| `/ask` | `Ask.jsx` | Yes |
| `/admin` | `AdminLogin.jsx` | No |
| `/admin/dashboard` | `AdminDashboard.jsx` | Admin JWT check |

---

## Key Frontend Components

| Component | Role |
|---|---|
| `Navbar.jsx` | Shared sticky top nav (all app pages); owns logout + admin link visibility |
| `BottomNav.jsx` | Mobile-only fixed bottom tab bar (`sm:hidden`); Today / History / Insights |
| `ChatUI.jsx` | Shared chat bubble UI; used by `Insights.jsx` drawer and `Ask.jsx`; renders markdown in assistant messages |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/entries` | None (user_id in body) | Save entry, trigger Claude response + mood detection |
| `GET` | `/api/insights/stats` | Bearer JWT | Streak + mood series (30 days) |
| `POST` | `/api/insights/digest` | Bearer JWT | Weekly AI digest (≥3 entries required) |
| `POST` | `/api/insights/chat` | Bearer JWT | Q&A over last 30 entries |
| `POST` | `/api/admin/login` | None | Admin credential check, returns JWT |
| `GET` | `/api/admin/users` | Admin JWT | User list with entry counts |
| `PATCH` | `/api/admin/users/:id/status` | Admin JWT | Set user status |
| `POST` | `/api/admin/notes` | Admin JWT | Add note for user |
| `GET` | `/api/admin/notes/:userId` | Admin JWT | Get notes for user |
| `GET` | `/api/admin/logs` | Admin JWT | Activity logs (filterable) |
| `GET` | `/api/admin/metrics` | Admin JWT | Product metrics |
| `GET` | `/api/admin/ai-costs` | Admin JWT | AI token/cost breakdown |

---

## Design System (Dark Mode Only — No Exceptions)

| Token | CSS Variable | Value |
|---|---|---|
| Background | `--color-bg` | `#0C0C0C` |
| Surface | `--color-surface` | `#141414` |
| Elevated | `--color-elevated` | `#1C1C1C` |
| Border | `--color-border` | `#2A2520` |
| Text | `--color-text` | `#F5F0E8` |
| Secondary Text | `--color-secondary` | `#A09A8E` |
| Muted | `--color-muted` | `#8C8680` (WCAG AA verified against all three bg levels) |
| Accent Gold | `--color-gold` | `#D4A96A` |
| Success | `--color-success` | `#6BAE8A` |
| Error | `--color-error` | `#C96A6A` |

All tokens defined in `client/src/index.css` `@theme` block. Used as Tailwind utilities: `bg-bg`, `text-gold`, `border-border`, etc.

## Typography
All fonts loaded from Google Fonts via `index.html`.

| Role | Font |
|---|---|
| Headings | DM Serif Display (`font-heading`) |
| Body / UI | Sora weights 300, 400, 500, 600 (`font-sans`) |
| Timestamps / IDs | JetBrains Mono (`font-mono`) |

---

## AI Prompt Architecture

All prompts live in `config/prompts.js`. Never inline in route files.

### Persona (shared across all three prompts)
Reflect is a brilliant, seasoned psychologist — warm, witty, disarmingly charming. Understands the Indian urban experience: ambition, family pressure, guilt, hustle culture. Never preachy.

**Forbidden phrases (all prompts):** "I hear you", "That must be hard", "Thank you for sharing", "It sounds like", "I can sense", "I can imagine"

**Crisis guardrail (all prompts):** If entry signals suicidal ideation, active self-harm, or ongoing abuse — drop wit entirely, be warm and present only, include: iCall: 9152987821 | Vandrevala Foundation: 1860-2662-345 (available 24/7)

### `JOURNAL_SYSTEM_PROMPT` — entry response (`max_tokens: 150`)
- 3–5 lines; ends with exactly one question that cuts to the real thing
- **Every response must include exactly one psychological concept** — avoidance, cognitive distortion, fawn response, attribution bias, social comparison, rumination, negativity bias, etc. One sentence, conversational, woven in naturally
- Never start two responses the same way

### `DIGEST_SYSTEM_PROMPT` — weekly digest (`max_tokens: 400`)
- Finds the through-line across the week's entries
- Names psychological patterns simply (rumination, avoidance, perfectionism, etc.)
- 4–8 lines; ends with one question or observation that opens something up
- Used in `POST /api/insights/digest` (requires ≥3 entries in last 7 days)

### `ASK_SYSTEM_PROMPT` — Q&A chat (`max_tokens: 250`)
- Answers questions about the user's journal and patterns
- References specific entries when relevant
- Out-of-scope guardrail: redirects non-journal questions warmly
- No medical/legal/financial advice
- Context: last 30 entries, each truncated to 300 chars, appended to system prompt
- Used in `POST /api/insights/chat`

---

## Accessibility
- WCAG AA minimum contrast throughout
- `cursor: pointer` applied globally to all `button`, `[role="button"]`, `[role="tab"]` elements
- All interactive elements have hover states
- Gold `focus-visible` outline (`#D4A96A`) globally via `index.css`
- Semantic HTML throughout
- ARIA labels on all icon-only buttons
- `aria-live` on AI response regions

---

## Build Phases

### Phase 1 — Foundation `COMPLETE` (F01–F05, F09, F10, F16–F19)
- Auth flow: signup, login, logout, session persistence via Supabase
- Today screen: rotating prompts, auto-growing textarea, save flow, streak/total stats strip
- History screen: collapsed entry pills, expand/collapse, inline edit, delete, search with match highlighting
- Supabase: `entries` table with RLS; explicit `GRANT` to `authenticated`, `anon`, `service_role`

### Phase 2 — AI Heart `COMPLETE` (F11–F15)
- Every entry triggers a Claude Haiku response via `POST /api/entries`
- Save flow: frontend → insert (service role) → Claude call → `ai_response` patched → full entry returned
- Done state UX: entry text + AI response shown together; "Write another entry" returns to form
- Model config: `config/models.js`; keys in root `.env` only

### Phase 3 — Admin Portal `COMPLETE` (F29–F35, F37)
- Admin login at `/admin`: credentials verified server-side, `user_roles` checked for `role = 'admin'`
- Session in `sessionStorage` as JWT; verified on every protected route via `requireAdmin` middleware
- Dashboard: Users tab (list, status badges, disable/deactivate/reactivate, notes panel) + Activity tab (logs filterable by user, event type, date range)
- Backend: `server/routes/admin.js` at `/api/admin`; two Supabase clients (service role for DB, publishable for sign-in)
- DB: `status` column on `user_roles` (`active` / `disabled` / `deactivated`)

### Phase 4 — Product Metrics `COMPLETE` (F36, F38)
- `tokens_used` on `entries` (input + output as combined integer); cost computed at display time
- `GET /api/admin/metrics`: total_users, DAU, entries/day (7d), voice/text split, streak distribution, retention cohorts
- `GET /api/admin/ai-costs`: tokens by day, today/week/month/projected totals; Haiku pricing $0.80/$4.00 per M (75/25 split assumption)
- Admin Metrics tab: `MetricCard` components, horizontal bar charts, streak 2×2 grid, retention cohort table, cost table

### Phase 5 — Full Today Screen `COMPLETE` (F06, F07, F08, F20–F24)
- Voice entry: Web Speech API (`recognition.continuous`, `lang: 'en-IN'`); mic pulses red; `input_type: 'voice'`
- Image upload: disabled placeholder with "Coming soon" tooltip; no backend wired
- Mood: 5 pills (Happy/Grateful/Neutral/Stressed/Anxious); selected highlights gold; auto-detected by Claude when not manually chosen; emoji in done state + History pills
- Done state (F23): on mount, if today's entry exists → load directly into done state; blank form only if nothing written yet today
- Stats strip: streak · total entries · most recent mood emoji

### Phase 6 — Insights `COMPLETE` (F25–F28)
- **Shared navigation:** `Navbar.jsx` (sticky top, all pages, owns logout + admin link), `BottomNav.jsx` (mobile-only fixed bottom tab bar)
- **Sticky CTA bar** on Insights: "Understand yourself a little better" pinned below navbar (`sticky top-14 z-20`); links to `/ask` on mobile, opens drawer on desktop
- **Backend:** `GET /api/insights/stats` (streak + 30-day mood series), `POST /api/insights/digest` (weekly digest, ≥3 entries), `POST /api/insights/chat` (Q&A, last 30 entries, 300-char truncation)
- **`Insights.jsx`:** streak/total cards, SVG mood line graph with trend indicator, weekly digest with markdown rendering, Ask My Journal link
- **`Ask.jsx`:** mobile full-screen chat page
- **`ChatUI.jsx`:** shared chat bubbles; markdown rendered in assistant messages; disclaimer banner; clear chat with confirm
- **AI system prompts** extracted to `config/prompts.js`: three separate prompts with full Reflect persona, psychological concept layer, crisis guardrails, Indian urban context
- **Markdown rendering:** `renderMarkdown()` in `Today.jsx`, `Insights.jsx`, and `ChatUI.jsx` — parses `**bold**` and `*italic*`

### Phase 7 — Telegram Bot `PENDING` (N01–N06)

### Phase 8 — Deploy `PENDING`
