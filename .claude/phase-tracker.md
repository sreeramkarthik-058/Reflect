# Build Phase Tracker

## Phase 1 — Foundation `COMPLETE`
F01 Signup · F02 Login · F03 Logout · F04 Session persistence · F05 Text entry · F09 Input type logged · F10 Timestamp on entry · F16 Entry history · F17 Collapsed entry pills · F18 Edit entry · F19 Search entries

## Phase 2 — AI Heart `COMPLETE`
F11 AI response to entry · F12 Reflect personality prompt · F13 Response displayed in UI · F14 Backend Claude call (server-side only) · F15 AI response stored on entry row (`ai_response` column)

## Phase 3 — Admin Portal `COMPLETE`
F29 Admin login (`/admin`, sessionStorage JWT) · F30 Role check via `user_roles` table · F31 User list (entry count, last active, status badge) · F32 Disable user · F33 Deactivate user · F34 Reactivate user · F35 Admin notes (`admin_notes` table) · F37 Activity logs filterable by user / event type / date range

## Phase 4 — Product Metrics `COMPLETE`
F36 Product metrics dashboard (total users, DAU, entries/day 7d avg, voice/text split, streak distribution, retention cohorts this week / last week / last month) · F38 AI cost tracker (tokens per day, daily/weekly/monthly/projected cost, Haiku pricing $0.80/$4.00 per M, 75/25 input/output split)

## Phase 5 — Full Today Screen `COMPLETE`
F06 Voice entry (Web Speech API, `recognition.continuous`, `lang: 'en-IN'`, Chrome/Edge) · F07 Image upload placeholder (disabled, "Coming soon" tooltip) · F08 Mood tag (5 pills: Happy/Grateful/Neutral/Stressed/Anxious; saved to `entries.mood`; auto-detected by Claude when not manually chosen; emoji in done state + History) · F20 Context-aware greeting (time of day + first name) · F21 Rotating prompts (6 variants, 4.8 s cycle, fade transition) · F22 Stats strip (streak · total entries · most recent mood emoji) · F23 Done state loads today's existing entry on mount · F24 Visible textarea border

## Phase 6 — Insights `COMPLETE`
F25 Streak + total entries cards · F26 SVG mood line graph (30 days, trend indicator) · F27 Weekly AI digest (JSON output from Claude; cached in `weekly_digests` table keyed on `user_id + week_start`; staleness check via entry `created_at`/`updated_at` vs digest `created_at`; `DigestView` renders structured object explicitly — no text parsing) · F28 Ask My Journal chat (desktop slide-in drawer + mobile `/ask` full-screen; `ChatUI.jsx` shared; markdown in assistant bubbles; disclaimer; clear chat)

Additional Phase 6 deliverables:
- `Navbar.jsx` — shared sticky top nav across Today / History / Insights / Ask; owns logout and admin link
- `BottomNav.jsx` — mobile-only fixed bottom tab bar (`sm:hidden`); Admin tab (shield icon) visible to admin users only after Insights tab
- Sticky "Understand yourself" CTA bar on Insights (`sticky top-14 z-20`)
- AI prompts extracted to `config/prompts.js` (JOURNAL / DIGEST / ASK); full Reflect persona with mandatory psychological concept per response, crisis guardrails, Indian urban context
- `inlineMarkdown()` applied in Today.jsx, Insights.jsx, ChatUI.jsx — regex parser for `**bold**` / `*italic*`; no external library
- Stats strip: "History →" hidden on mobile (`hidden sm:inline`); visible on desktop only
- WCAG AA audit: muted color `#8C8680`, global `cursor: pointer`, `focus-visible` gold outline, hover states everywhere

## Phase 7 — Telegram Bot `PENDING`
N01 · N02 · N03 · N04 · N05 · N06

## Phase 8 — Deploy & Polish `PENDING`

### Deployment
- Render setup: backend web service + frontend static site; env vars wired per `render.yaml`

### Forgot Password / Reset Password `PENDING`
- F39 "Forgot password?" link on `Login.jsx` → `/forgot-password`
- F40 `ForgotPassword.jsx` — email input; calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<prod-url>/reset-password' })`; success state with on-brand copy ("Check your inbox — we've sent a reset link"); error states
- F41 `ResetPassword.jsx` at `/reset-password` — handles the Supabase `#access_token` redirect fragment; calls `supabase.auth.updateUser({ password })` after extracting session from URL hash; success redirects to `/login`; Reflect-voiced copy throughout
- F42 Route added to `App.jsx` for `/forgot-password` and `/reset-password` (both unprotected)

### User Feedback `PENDING`
- F43 Supabase `feedback` table — `id`, `user_id` (nullable FK → `auth.users.id`), `rating` (integer 1–5), `message` (text), `email` (text, nullable), `created_at`; RLS enabled; service role insert via backend
- F44 `POST /api/feedback` backend route — no auth required (accepts anonymous); inserts to `feedback` table via service role; rate-limit consideration noted
- F45 `FeedbackButton` component — subtle, present on all app screens (e.g. small icon in `Navbar.jsx` or a fixed bottom-right corner element on desktop; hidden behind BottomNav area on mobile); opens `FeedbackModal`
- F46 `FeedbackModal` — 5-star rating tap targets; free-text area with copy: "Tell us what's broken. Or what's brilliant. We can handle both."; optional email field ("So we can follow up, if you want"); submit → success state: "Got it. Every word of it." with auto-close; error state; spinner on submit
- F47 Admin Feedback tab in `AdminDashboard.jsx` — table of all submissions (rating, message, email if provided, user_id if logged in, timestamp); sortable by rating and date

## Phase 9 — Personalisation & Goals `PENDING`

### F-GOALS: User Goal Setting
- Users can define short-term and long-term personal goals via a goals UI (e.g. on Today or a dedicated `/goals` screen)
- Goals stored per user in a new `user_goals` Supabase table — `id`, `user_id` (FK → `auth.users.id`), `title` (text), `description` (text, nullable), `type` (`'short_term'` | `'long_term'`), `status` (`'active'` | `'completed'` | `'paused'`), `created_at`, `updated_at`
- AI journal responses incorporate active goals — when Claude responds to an entry, it is aware of the user's goals and nudges toward progress naturally (no lecturing)
- Weekly digest includes a goals-progress section — references active goals, notes journal entries that show movement or stagnation, poses a forward-looking question about the goal
- Insights screen shows a "Your Goals" section with goal cards and simple progress indicators (based on AI inference from journal content, not manual tracking)
- Ask My Journal is goals-aware — system prompt includes active goals alongside recent entries; can answer "Am I making progress on my goals?", "Which goal am I neglecting?", etc.
