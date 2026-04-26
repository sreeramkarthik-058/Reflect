import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const PROMPTS = [
  "What's actually on your mind right now?",
  "Something happened today. What was it?",
  "What are you not saying out loud?",
  "If today had a mood, what would it be?",
  "What do you wish someone had asked you today?",
  "One thing you noticed today.",
]

const DAY_MS = 86_400_000

function dayKey(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function calcStreak(entries) {
  if (!entries.length) return 0

  const daySet = new Set(entries.map(e => dayKey(e.created_at)))
  const todayMs = dayKey(new Date())
  const startMs = daySet.has(todayMs)
    ? todayMs
    : daySet.has(todayMs - DAY_MS)
      ? todayMs - DAY_MS
      : null

  if (startMs === null) return 0

  let streak = 0
  let cur = startMs
  while (daySet.has(cur)) {
    streak++
    cur -= DAY_MS
  }
  return streak
}

export default function Today() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [content, setContent] = useState('')
  const [savedEntry, setSavedEntry] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [stats, setStats] = useState({ streak: 0, total: 0 })
  const [writtenToday, setWrittenToday] = useState(false)
  const [promptIndex, setPromptIndex] = useState(0)
  const [promptFading, setPromptFading] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) await refreshStats(user.id)
    }
    init()
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setPromptFading(true)
      setTimeout(() => {
        setPromptIndex(i => (i + 1) % PROMPTS.length)
        setPromptFading(false)
      }, 300)
    }, 4800)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [content])

  async function refreshStats(userId) {
    const { data: entries, error } = await supabase
      .from('entries')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error || !entries) return

    const todayMs = dayKey(new Date())
    setWrittenToday(entries.some(e => dayKey(e.created_at) === todayMs))
    setStats({ streak: calcStreak(entries), total: entries.length })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    setSubmitting(true)
    setSubmitError('')
    setAiResponse('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/login')
      return
    }

    // Hide the form immediately — show the entry text + loading state
    setSavedEntry(trimmed)
    setContent('')
    setSubmitting(false)
    setAiLoading(true)

    let data, ok
    try {
      const res = await fetch('http://localhost:3001/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, user_id: session.user.id }),
      })
      ok = res.ok
      data = await res.json()
    } catch {
      // Restore form so the user can try again
      setContent(trimmed)
      setSavedEntry('')
      setSubmitError('Could not reach the server. Is the backend running?')
      setAiLoading(false)
      return
    }

    if (!ok) {
      setContent(trimmed)
      setSavedEntry('')
      setSubmitError('Something went sideways. The entry did not save.')
      setAiLoading(false)
      return
    }

    setAiLoading(false)
    if (data.ai_response) setAiResponse(data.ai_response)
    await refreshStats(session.user.id)
  }

  function handleWriteAnother() {
    setSavedEntry('')
    setAiResponse('')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]

  const greetingBody = writtenToday
    ? "You've written today. Reflect has read it and has some thoughts. As usual."
    : "You haven't written today yet. Your future self is taking notes, but no pressure."

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 h-14 flex items-center justify-between shrink-0">
        <span className="font-heading text-2xl text-text leading-none" aria-label="Reflect">
          Reflect
        </span>
        <div className="flex items-center gap-1">
          <Link
            to="/history"
            className="text-sm text-secondary hover:text-text transition-colors py-2 px-3"
          >
            History
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-secondary hover:text-text transition-colors py-2 px-3 -mr-3"
          >
            Log out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-10">

        {/* Greeting */}
        <div className="mb-9">
          {firstName && (
            <h1 className="font-heading text-3xl text-text mb-1">{firstName}</h1>
          )}
          <p className="text-secondary text-sm leading-relaxed">{greetingBody}</p>
        </div>

        {savedEntry ? (
          /* Done state — entry + AI response */
          <div className="flex flex-col gap-5">
            <div className="bg-elevated border border-border rounded px-4 py-3">
              <p className="text-muted text-sm leading-relaxed whitespace-pre-wrap">{savedEntry}</p>
            </div>

            {aiLoading && (
              <div
                className="pl-4 border-l-2 border-gold/40"
                aria-live="polite"
                aria-label="Reflect is generating a response"
              >
                <p className="text-muted text-sm italic animate-pulse">Reflect is thinking…</p>
              </div>
            )}

            {aiResponse && !aiLoading && (
              <div
                className="pl-4 border-l-2 border-gold/40"
                aria-live="polite"
                aria-label="Response from Reflect"
              >
                <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                  {aiResponse}
                </p>
              </div>
            )}

            {!aiLoading && (
              <button
                onClick={handleWriteAnother}
                className="self-start px-6 py-3 border border-gold text-gold text-sm font-semibold rounded hover:bg-gold/10 transition-colors"
              >
                Write another entry
              </button>
            )}
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <p
              aria-live="polite"
              className={`text-secondary text-sm italic select-none transition-opacity duration-300 ${
                promptFading ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {PROMPTS[promptIndex]}
            </p>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Start writing..."
              rows={6}
              className="w-full bg-elevated border border-border rounded px-4 py-3 text-text placeholder:text-muted text-base leading-relaxed focus:border-gold focus:outline-none transition-colors resize-none min-h-[160px]"
              aria-label="Journal entry"
            />

            <p className="text-muted text-xs leading-relaxed">
              Your entries are private and encrypted. Reflect never shares your writing with anyone.
            </p>

            {submitError && (
              <p className="text-error text-sm" role="alert">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="self-start bg-gold text-bg text-sm font-semibold px-6 py-3 rounded hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Save entry'}
            </button>
          </form>
        )}

        {/* Stats strip */}
        <div className="mt-12 pt-6 border-t border-border flex items-baseline gap-8 text-sm">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-lg text-text">{stats.streak}</span>
            <span className="text-secondary">day streak</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-lg text-text">{stats.total}</span>
            <span className="text-secondary">entries</span>
          </div>
          <Link
            to="/history"
            className="ml-auto text-gold hover:underline transition-opacity py-2 -my-2"
            aria-label="View entry history"
          >
            History →
          </Link>
        </div>
      </main>
    </div>
  )
}
