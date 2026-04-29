import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'

function renderMarkdown(text) {
  const result = []
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let last = 0, m, k = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) result.push(text.slice(last, m.index))
    if (m[0].startsWith('**')) result.push(<strong key={k++}>{m[1]}</strong>)
    else result.push(<em key={k++}>{m[2]}</em>)
    last = regex.lastIndex
  }
  if (last < text.length) result.push(text.slice(last))
  return result
}

const PROMPTS = [
  "What's actually on your mind right now?",
  "Something happened today. What was it?",
  "What are you not saying out loud?",
  "If today had a mood, what would it be?",
  "What do you wish someone had asked you today?",
  "One thing you noticed today.",
]

const MOODS = [
  { label: 'Happy',    emoji: '😊' },
  { label: 'Grateful', emoji: '🙏' },
  { label: 'Neutral',  emoji: '😐' },
  { label: 'Stressed', emoji: '😤' },
  { label: 'Anxious',  emoji: '😰' },
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
  while (daySet.has(cur)) { streak++; cur -= DAY_MS }
  return streak
}

function moodEmoji(label) {
  return MOODS.find(m => m.label === label)?.emoji ?? ''
}

export default function Today() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  // Form
  const [content, setContent]     = useState('')
  const [mood, setMood]           = useState(null)
  const [inputType, setInputType] = useState('text')
  const [listening, setListening] = useState(false)

  // Done state
  const [savedEntry, setSavedEntry] = useState('')
  const [savedMood, setSavedMood]   = useState(null)
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading]   = useState(false)

  // Submit
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Stats
  const [stats, setStats]             = useState({ streak: 0, total: 0, recentMood: null })
  const [writtenToday, setWrittenToday] = useState(false)

  // Prompts
  const [promptIndex, setPromptIndex]   = useState(0)
  const [promptFading, setPromptFading] = useState(false)

  const textareaRef    = useRef(null)
  const recognitionRef = useRef(null)

  // ── Init ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) return

      const { data: entries } = await supabase
        .from('entries')
        .select('created_at, mood')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const allEntries = entries || []
      const todayMs    = dayKey(new Date())
      setWrittenToday(allEntries.some(e => dayKey(e.created_at) === todayMs))
      const recentMood = allEntries.find(e => e.mood)?.mood || null
      setStats({ streak: calcStreak(allEntries), total: allEntries.length, recentMood })
    }
    init()
  }, [])

  // ── Prompt rotation ───────────────────────────────────────────────────────────

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

  // ── Textarea auto-grow ────────────────────────────────────────────────────────

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [content])

  // ── Cleanup voice on unmount ──────────────────────────────────────────────────

  useEffect(() => () => { recognitionRef.current?.stop() }, [])

  // ── Refresh stats after save ──────────────────────────────────────────────────

  async function refreshStats(userId) {
    const { data: entries } = await supabase
      .from('entries')
      .select('created_at, mood')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (!entries) return
    const todayMs    = dayKey(new Date())
    const recentMood = entries.find(e => e.mood)?.mood || null
    setWrittenToday(entries.some(e => dayKey(e.created_at) === todayMs))
    setStats({ streak: calcStreak(entries), total: entries.length, recentMood })
  }

  // ── Voice ─────────────────────────────────────────────────────────────────────

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Voice input is only available on Chrome and Edge.')
      return
    }

    const recognition = new SR()
    recognitionRef.current = recognition
    recognition.continuous     = true
    recognition.interimResults = false
    recognition.lang           = 'en-IN'

    recognition.onresult = event => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map(r => r[0].transcript)
        .join(' ')
        .trim()
      if (transcript) setContent(prev => prev ? `${prev} ${transcript}` : transcript)
    }

    recognition.onend   = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognition.start()
    setListening(true)
    setInputType('voice')
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    // Stop any live recording before saving
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
    }

    setSubmitting(true)
    setSubmitError('')
    setAiResponse('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/login'); return }

    const currentMood      = mood
    const currentInputType = inputType

    setSavedEntry(trimmed)
    setSavedMood(currentMood)
    setContent('')
    setMood(null)
    setInputType('text')
    setSubmitting(false)
    setAiLoading(true)

    let data, ok
    try {
      const res = await fetch('http://localhost:3001/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content:    trimmed,
          user_id:    session.user.id,
          mood:       currentMood,
          input_type: currentInputType,
        }),
      })
      ok   = res.ok
      data = await res.json()
    } catch {
      setContent(trimmed)
      setMood(currentMood)
      setSavedEntry('')
      setSavedMood(null)
      setSubmitError('Could not reach the server. Is the backend running?')
      setAiLoading(false)
      return
    }

    if (!ok) {
      setContent(trimmed)
      setMood(currentMood)
      setSavedEntry('')
      setSavedMood(null)
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
    setSavedMood(null)
    setAiResponse('')
    setMood(null)
    setInputType('text')
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]

  const greetingBody = writtenToday
    ? "You've written today. Reflect has read it and has some thoughts. As usual."
    : "You haven't written today yet. Your future self is taking notes, but no pressure."

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      <Navbar />

      {/* Main content */}
      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-10 pb-24 sm:pb-10">

        {/* Greeting — F20 */}
        <div className="mb-9">
          {firstName && (
            <h1 className="font-heading text-3xl text-text mb-1">{firstName}</h1>
          )}
          <p className="text-secondary text-sm leading-relaxed">{greetingBody}</p>
          {writtenToday && (
            <Link
              to="/insights"
              className="inline-block mt-2 text-sm text-gold hover:opacity-75 transition-opacity"
            >
              → See what your entries say about you
            </Link>
          )}
        </div>

        {savedEntry ? (
          /* Done state — F23 */
          <div className="flex flex-col gap-5">
            <div className="bg-elevated border border-border rounded px-4 py-3">
              {savedMood && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base" aria-hidden="true">{moodEmoji(savedMood)}</span>
                  <span className="text-xs text-muted">{savedMood}</span>
                </div>
              )}
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
                  {renderMarkdown(aiResponse)}
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

            {/* Rotating prompt — F21 */}
            <p
              aria-live="polite"
              className={`text-secondary text-sm italic select-none transition-opacity duration-300 ${
                promptFading ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {PROMPTS[promptIndex]}
            </p>

            {/* Textarea — F24: visible border */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Start writing..."
              rows={6}
              className="w-full bg-elevated border border-muted/40 rounded px-4 py-3 text-text placeholder:text-muted text-base leading-relaxed focus:border-gold focus:outline-none transition-colors resize-none min-h-[160px]"
              aria-label="Journal entry"
            />

            {/* Input type buttons — F06, F07 */}
            <div className="flex items-center gap-2">

              {/* Voice — F06 */}
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={listening ? 'Stop recording' : 'Start voice entry'}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm border transition-colors animate-pulse-when-listening ${
                  listening
                    ? 'bg-error border-error text-bg animate-pulse font-medium'
                    : 'text-secondary border-border hover:text-text hover:border-muted'
                }`}
              >
                {listening ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                      <rect width="10" height="10" rx="1"/>
                    </svg>
                    Stop
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-1 17.93V22H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A8.001 8.001 0 0 0 20 12a1 1 0 1 0-2 0 6 6 0 0 1-12 0 1 1 0 1 0-2 0 8.001 8.001 0 0 0 7 7.93z"/>
                    </svg>
                    Voice
                  </>
                )}
              </button>

              {/* Image placeholder — F07 */}
              <div className="relative group">
                <button
                  type="button"
                  disabled
                  aria-label="Upload photo — coming soon"
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-muted border border-border cursor-not-allowed opacity-50"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Photo
                </button>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded bg-elevated border border-border px-2 py-1 text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100">
                  Coming soon
                </span>
              </div>
            </div>

            {/* Mood pills — F08 */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Select your mood">
              {MOODS.map(({ label, emoji }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMood(prev => prev === label ? null : label)}
                  aria-pressed={mood === label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    mood === label
                      ? 'border-gold text-gold bg-gold/10'
                      : 'border-border text-secondary hover:border-muted hover:text-text'
                  }`}
                >
                  <span aria-hidden="true">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>

            <p className="text-muted text-xs leading-relaxed">
              Your entries are private and encrypted. Reflect never shares your writing with anyone.
            </p>

            {submitError && (
              <p className="text-error text-sm" role="alert">{submitError}</p>
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

        {/* Stats strip — F22 */}
        <div className="mt-12 pt-6 border-t border-border flex items-center gap-8 text-sm">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-lg text-text">{stats.streak}</span>
            <span className="text-secondary">day streak</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-lg text-text">{stats.total}</span>
            <span className="text-secondary">entries</span>
          </div>
          {stats.recentMood && (
            <div className="flex items-center gap-1.5">
              <span className="text-base" aria-hidden="true">{moodEmoji(stats.recentMood)}</span>
              <span className="text-secondary text-xs">{stats.recentMood.toLowerCase()}</span>
            </div>
          )}
          <Link
            to="/history"
            className="ml-auto text-gold hover:underline transition-opacity py-2 -my-2"
            aria-label="View entry history"
          >
            History →
          </Link>
        </div>

      </main>

      <BottomNav />
    </div>
  )
}
