import { Link } from 'react-router-dom'

// ── Demo chat in hero ──────────────────────────────────────────────────────────

function DemoChat() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 space-y-5 w-full max-w-md mx-auto lg:mx-0">
      {/* User entry bubble */}
      <div className="flex justify-end">
        <div className="bg-elevated border border-border rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs">
          <p className="text-secondary text-sm leading-relaxed">
            Been staring at my screen for three hours. Can't decide if I am stuck or just avoiding. Again.
          </p>
        </div>
      </div>

      {/* AI response */}
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-elevated border border-gold/30 flex items-center justify-center shrink-0 mt-0.5">
          <span className="font-heading text-gold text-xs leading-none">R</span>
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-text text-sm leading-relaxed">
            Avoidance dressed up as analysis. The mind finds extraordinary ways to protect you from the moment of decision.
          </p>
          <p className="text-gold text-sm leading-relaxed italic">
            What's the actual fear here, not the surface one?
          </p>
          <p className="text-muted text-xs pt-1">Reflect identified: avoidance</p>
        </div>
      </div>

      {/* Fake input */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-3 bg-elevated rounded-full px-4 py-2.5 border border-border">
          <p className="text-muted text-sm flex-1">Write anything...</p>
          <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4A96A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Insights screen mockup ─────────────────────────────────────────────────────

const MOCK_MOOD = [3, 2, 4, 3, 5, 4, 5]

function MoodLineMini() {
  const W = 220, H = 48, pad = 8
  const dx = (W - pad * 2) / (MOCK_MOOD.length - 1)
  const sy = v => pad + (1 - (v - 1) / 4) * (H - pad * 2)
  const pts = MOCK_MOOD.map((v, i) => `${pad + i * dx},${sy(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 40 }}>
      <polyline points={pts} fill="none" stroke="#D4A96A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {MOCK_MOOD.map((v, i) => (
        <circle key={i} cx={pad + i * dx} cy={sy(v)} r="2.5" fill="#D4A96A" />
      ))}
    </svg>
  )
}

function InsightsMockup() {
  return (
    <div className="relative mx-auto lg:mx-0 lg:ml-auto" style={{ maxWidth: 260 }}>
      {/* Soft glow behind phone */}
      <div
        className="absolute inset-0 rounded-[2.5rem] pointer-events-none"
        style={{ boxShadow: '0 0 80px rgba(212,169,106,0.12)', filter: 'blur(2px)' }}
      />
      {/* Phone frame */}
      <div className="relative bg-bg border-2 border-border rounded-[2.5rem] overflow-hidden" style={{ paddingTop: 20, paddingBottom: 20 }}>
        {/* Notch */}
        <div className="flex justify-center mb-3">
          <div className="w-16 h-1.5 bg-border rounded-full" />
        </div>

        {/* Screen content */}
        <div className="px-3 space-y-3">
          {/* Mini navbar */}
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="font-heading text-text" style={{ fontSize: 13 }}>Reflect</span>
            <span className="text-muted" style={{ fontSize: 9 }}>9:41</span>
          </div>

          {/* Mood card */}
          <div className="bg-surface rounded-xl p-3 border border-border">
            <div className="flex justify-between items-center mb-2">
              <p className="text-text font-medium" style={{ fontSize: 11 }}>Mood this week</p>
              <span className="text-gold" style={{ fontSize: 10 }}>+14%</span>
            </div>
            <MoodLineMini />
            <div className="flex justify-between mt-1.5">
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <span key={i} className="text-muted" style={{ fontSize: 8 }}>{d}</span>
              ))}
            </div>
          </div>

          {/* Digest preview */}
          <div className="bg-surface rounded-xl p-3 border border-border space-y-2">
            <p className="text-muted uppercase tracking-widest" style={{ fontSize: 8 }}>This week</p>
            <p className="text-text leading-snug" style={{ fontSize: 10 }}>
              You have been circling the same decision all week. That is not stalling. That is processing.
            </p>
            <div className="h-px bg-border" />
            <div className="flex gap-1 flex-wrap">
              {['Avoidance', 'Clarity'].map(t => (
                <span
                  key={t}
                  className="rounded-full border border-gold/20 text-gold"
                  style={{ fontSize: 8, padding: '2px 8px', background: 'rgba(212,169,106,0.08)' }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Ask bar */}
          <div className="bg-surface rounded-full border border-border px-3 flex items-center gap-2" style={{ paddingTop: 6, paddingBottom: 6 }}>
            <p className="text-muted flex-1" style={{ fontSize: 10 }}>Ask my journal...</p>
            <div className="w-4 h-4 rounded-full bg-gold/20 flex items-center justify-center">
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#D4A96A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center mt-4">
          <div className="w-20 h-1 bg-border rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ── Feature cards ──────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, body }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
      <div className="w-10 h-10 rounded-lg bg-elevated border border-border flex items-center justify-center">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="font-heading text-xl text-text">{title}</h3>
        <p className="text-secondary text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4A96A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-5 0v-15A2.5 2.5 0 0 1 9.5 2z" />
        <path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v15a2.5 2.5 0 0 1-5 0v-15A2.5 2.5 0 0 1 14.5 2z" />
        <path d="M3 10a2.5 2.5 0 0 1 0-5h18a2.5 2.5 0 0 1 0 5" />
        <path d="M3 19a2.5 2.5 0 0 0 0 5h18a2.5 2.5 0 0 0 0-5" />
      </svg>
    ),
    title: 'AI that gets you',
    body: 'Real psychological insight after every entry. Not affirmations, actual observations.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4A96A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Understand your patterns',
    body: 'Weekly digests. Mood graph. Ask your journal anything. It has been paying attention.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4A96A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'Completely private',
    body: 'Your entries are yours. No ads. No training. No judgment. Probably.',
  },
]

// ── Landing page ───────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg">

      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-bg/95 backdrop-blur-sm border-b border-border px-6 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Reflect logo" className="h-8 w-auto" />
          <span className="font-heading text-xl text-text leading-none">Reflect</span>
        </div>
        <Link
          to="/login"
          className="px-5 py-2 border border-border text-text text-sm rounded transition-colors hover:border-gold hover:text-gold"
        >
          Log in
        </Link>
      </nav>

      {/* Wit strip */}
      <div className="bg-surface border-b border-border px-6 py-3.5">
        <p
          className="text-center text-sm italic font-light tracking-wide"
          style={{ color: 'rgba(212,169,106,0.65)' }}
        >
          The journaling app that talks back. We know. Hear us out.
        </p>
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

          {/* Left: copy + CTA */}
          <div className="space-y-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
              AI-powered journaling
            </p>
            <h1 className="font-heading text-5xl sm:text-6xl text-text leading-tight">
              Your thoughts deserve better than a{' '}
              <span className="text-gold italic">blank page</span>.
            </h1>
            <p className="text-secondary text-lg leading-relaxed font-light max-w-md">
              Write. Get a response that is warm, sharp, and occasionally uncomfortably accurate. Understand yourself a little better every day.
            </p>
            <div className="space-y-4">
              <Link
                to="/signup"
                className="block w-full sm:w-auto sm:inline-block text-center px-8 py-4 bg-gold text-bg font-semibold text-sm rounded hover:opacity-90 transition-opacity"
              >
                Start journaling, it's free
              </Link>
              <p className="text-muted text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-secondary underline underline-offset-2 hover:text-text transition-colors">
                  Log in
                </Link>
              </p>
            </div>
          </div>

          {/* Right: demo chat */}
          <DemoChat />
        </div>
      </section>

      {/* Insights section */}
      <section className="bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

            {/* Left: copy — on mobile shows second */}
            <div className="space-y-6 order-2 lg:order-1">
              <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                Insights
              </p>
              <h2 className="font-heading text-4xl sm:text-5xl text-text leading-tight">
                It notices what you don't.
              </h2>
              <p className="text-secondary text-lg leading-relaxed font-light max-w-md">
                Mood patterns, weekly themes, and the psychology behind your entries. Surfaced automatically.
              </p>
            </div>

            {/* Right: phone mockup — on mobile shows first */}
            <div className="order-1 lg:order-2">
              <InsightsMockup />
            </div>

          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-surface border-t border-border">
        <div className="max-w-xl mx-auto px-6 py-20 sm:py-28 text-center space-y-8">
          <div className="space-y-3">
            <h2 className="font-heading text-4xl sm:text-5xl text-text">
              Ready to start?
            </h2>
            <p className="text-secondary text-lg font-light">
              Free forever. No credit card needed.
            </p>
          </div>
          <Link
            to="/signup"
            className="inline-block px-10 py-4 bg-gold text-bg font-semibold text-sm rounded hover:opacity-90 transition-opacity"
          >
            Start journaling, it's free
          </Link>
        </div>
      </section>

    </div>
  )
}
