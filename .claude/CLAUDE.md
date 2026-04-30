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
- **Node.js + Express** — API server on `localhost:3001`; does NOT hot-reload — must be manually restarted after any change to `server/` or `config/`
- **`server/index.js`** — entry point; mounts all routers, CORS configured for `localhost:5173`
- **`server/routes/entries.js`** — `POST /api/entries`; insert + Claude call + mood detection
- **`server/routes/insights.js`** — `GET /stats`, `POST /digest`, `POST /chat`; all require Bearer JWT
- **`server/routes/admin.js`** — all `/api/admin/*` routes; two Supabase clients (service role + publishable)

### Config
- **`config/models.js`** — single export `{ journal: 'claude-haiku-4-5-20251001' }`; all Claude model names live here, never hardcoded in routes
- **`config/prompts.js`** — three named exports: `JOURNAL_SYSTEM_PROMPT`, `DIGEST_SYSTEM_PROMPT`, `ASK_SYSTEM_PROMPT`; never inline prompts in route files

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

### `weekly_digests`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users.id` |
| `week_start` | date | Monday of ISO week (YYYY-MM-DD); computed by `isoWeekMonday()` in insights.js |
| `opening` | text | Punchy opening sentence |
| `patterns` | jsonb | Array of pattern strings e.g. `["pattern 1", "pattern 2", "pattern 3"]` |
| `concept_name` | text | Psychology concept name |
| `concept_explanation` | text | Plain-English one-sentence explanation |
| `question` | text | Closing question |
| `entry_count` | integer | Number of entries included in this digest |
| `tokens_used` | integer | nullable |
| `created_at` | timestamptz | Stamped on every upsert — represents "last generated at", not "first created" |

Unique constraint on `(user_id, week_start)` — one digest per user per week. RLS enabled. `GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_digests TO authenticated, anon, service_role`.

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
| `Navbar.jsx` | Shared sticky top nav (all app pages); owns logout + admin link visibility; queries `user_roles` on mount |
| `BottomNav.jsx` | Mobile-only fixed bottom tab bar (`sm:hidden`); Today / History / Insights / Admin (admin-only); queries `user_roles` on mount |
| `ChatUI.jsx` | Shared chat bubble UI; used by `Insights.jsx` drawer and `Ask.jsx`; renders `inlineMarkdown()` on assistant messages; disclaimer banner; clear chat |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/entries` | None (user_id in body) | Save entry, trigger Claude response + mood detection |
| `GET` | `/api/insights/stats` | Bearer JWT | Streak + mood series (30 days) |
| `POST` | `/api/insights/digest` | Bearer JWT | Weekly AI digest — JSON from Claude, cached in `weekly_digests` |
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
| Muted | `--color-muted` | `#8C8680` (WCAG AA verified: 5.4:1 on bg, 4.8:1 on surface, 4.6:1 on elevated) |
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

All prompts live in `config/prompts.js`. Never inline prompts in route files.

### Persona (shared across all three prompts)
Reflect is a brilliant, seasoned psychologist — warm, witty, disarmingly charming. Understands the Indian urban experience: ambition, family pressure, guilt, hustle culture. Never preachy.

**Forbidden phrases (all prompts):** "I hear you", "That must be hard", "Thank you for sharing", "It sounds like", "I can sense", "I can imagine"

**Crisis guardrail (all prompts):** If entry signals suicidal ideation, active self-harm, or ongoing abuse — drop wit entirely, be warm and present only, include: iCall: 9152987821 | Vandrevala Foundation: 1860-2662-345 (available 24/7)

### `JOURNAL_SYSTEM_PROMPT` — entry response (`max_tokens: 150`)
- 3–5 lines; ends with exactly one question that cuts to the real thing
- **Every response must include exactly one psychological concept** — avoidance, cognitive distortion, fawn response, attribution bias, social comparison, rumination, negativity bias, imposter syndrome, emotional labour, spotlight effect, catastrophising, sunk-cost thinking, projection, etc. One sentence, conversational, woven in naturally. Mandatory — no exceptions.
- Never start two responses the same way

### `DIGEST_SYSTEM_PROMPT` — weekly digest (`max_tokens: 400`)
- System prompt is persona-only: "You are Reflect. Respond only with the JSON object requested. No markdown, no preamble, no explanation outside the JSON."
- Format enforced in the **user message** as a JSON template with slot descriptions
- Claude returns: `{ "opening": "...", "patterns": ["...", "...", "..."], "concept": { "name": "...", "explanation": "..." }, "question": "..." }`
- Backend strips any accidental markdown fences, `JSON.parse()`s the response, validates shape, upserts to `weekly_digests`, returns structured object
- Frontend renders each field explicitly — no text parsing, no markdown splitting
- Cached per ISO week in `weekly_digests`; invalidated when any entry has `created_at` or `updated_at` newer than `digest.created_at`

### `ASK_SYSTEM_PROMPT` — Q&A chat (`max_tokens: 250`)
- Answers questions about the user's journal and patterns
- References specific entries when relevant; one psychological concept per response
- Out-of-scope guardrail: redirects non-journal questions warmly
- No medical/legal/financial advice
- Context: last 30 entries, each truncated to 300 chars, appended to system prompt
- Used in `POST /api/insights/chat`

---

## Weekly Digest Cache Logic

`POST /api/insights/digest` flow:
1. Compute `week_start` = Monday of current ISO week (`isoWeekMonday()`)
2. Query `weekly_digests` for `(user_id, week_start)` — fetch `created_at` along with content fields
3. Query `entries` for this week (also fetch `updated_at`)
4. If fewer than 3 entries → return `{ digest: null, entry_count: N }`
5. If cache exists → check if any entry has `created_at > digest.created_at` OR `updated_at > digest.created_at`. If none → serve cache (`cached: true`). If any → log "cache stale", fall through to generate.
6. Call Claude → parse JSON → validate shape → upsert to `weekly_digests` with `created_at: now()` (always stamp so it means "last generated at") → return structured object (`cached: false`)

---

## Accessibility
- WCAG AA minimum contrast throughout
- `cursor: pointer` applied globally to all `button`, `[role="button"]`, `[role="tab"]` elements via `index.css`
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
- Stats strip: streak · total entries · most recent mood emoji; "History →" hidden on mobile (`hidden sm:inline`)

### Phase 6 — Insights `COMPLETE` (F25–F28)
- **Shared navigation:** `Navbar.jsx` (sticky top, all pages, owns logout + admin link), `BottomNav.jsx` (mobile-only; Today / History / Insights / Admin for admins)
- **Sticky CTA bar** on Insights: "Understand yourself a little better" pinned below navbar (`sticky top-14 z-20`); links to `/ask` on mobile, opens drawer on desktop
- **Stats:** `GET /api/insights/stats` — streak + 30-day mood series; SVG mood line graph with trend indicator
- **Weekly digest:** JSON output from Claude, structured object returned to frontend, cached in `weekly_digests` with staleness invalidation on new/edited entries; `DigestView` renders opening/patterns/concept/question explicitly
- **Ask My Journal:** `POST /api/insights/chat` (Q&A, last 30 entries, 300-char truncation); desktop slide-in drawer + mobile `/ask` full-screen; `ChatUI.jsx` shared component
- **AI system prompts** in `config/prompts.js`: full Reflect persona, mandatory psychological concept in journal responses, JSON-enforced digest format, crisis guardrails, Indian urban context
- **Inline markdown:** `inlineMarkdown()` in `Today.jsx`, `Insights.jsx`, `ChatUI.jsx` — regex parser for `**bold**` / `*italic*`; no external library
- **WCAG AA audit:** muted `#8C8680`, global `cursor: pointer`, gold `focus-visible` outline, hover states everywhere

### Phase 7 — Telegram Bot `PENDING` (N01–N06)

### Phase 8 — Deploy `PENDING`
