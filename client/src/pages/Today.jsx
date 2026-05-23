import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

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
  let streak = 0, cur = startMs
  while (daySet.has(cur)) { streak++; cur -= DAY_MS }
  return streak
}

function moodEmoji(label) {
  return MOODS.find(m => m.label === label)?.emoji ?? ''
}

function UserBubble({ msg }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] sm:max-w-[70%]">
        {msg.mood && (
          <div className="flex justify-end items-center gap-1 mb-1 pr-1">
            <span className="text-sm" aria-hidden="true">{moodEmoji(msg.mood)}</span>
            <span className="text-muted text-xs">{msg.mood}</span>
          </div>
        )}
        <div className="bg-elevated border border-border rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    </div>
  )
}

function AIBubble({ msg }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-elevated border border-gold/30 flex items-center justify-center shrink-0 mt-0.5">
        <span className="font-heading text-gold text-xs leading-none">R</span>
      </div>
      <div className="max-w-[80%] sm:max-w-[70%] bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3">
        {msg.error ? (
          <p className="text-error text-sm">Could not save. Please try again.</p>
        ) : msg.loading ? (
          <p className="text-muted text-sm italic animate-pulse">Reflect is thinking…</p>
        ) : (
          <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap" aria-live="polite">
            {renderMarkdown(msg.content)}
          </p>
        )}
      </div>
    </div>
  )
}

export default function Today() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  const [content, setContent]     = useState('')
  const [mood, setMood]           = useState(null)
  const [inputType, setInputType] = useState('text')
  const [listening, setListening] = useState(false)

  const [messages, setMessages]   = useState([])
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [stats, setStats]               = useState({ streak: 0, total: 0, recentMood: null })
  const [writtenToday, setWrittenToday] = useState(false)

  const [promptIndex, setPromptIndex]   = useState(0)
  const [promptFading, setPromptFading] = useState(false)

  const textareaRef    = useRef(null)
  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)

  // ── Init ─────────────────────────────────────────────────────────────────────

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

  // ── Textarea auto-grow (capped) ───────────────────────────────────────────────

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [content])

  // ── Scroll to bottom on new messages ─────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Cleanup voice on unmount ──────────────────────────────────────────────────

  useEffect(() => () => { recognitionRef.current?.stop() }, [])

  // ── Refresh stats ─────────────────────────────────────────────────────────────

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
    if (!SR) { alert('Voice input is only available on Chrome and Edge.'); return }
    const recognition = new SR()
    recognitionRef.current  = recognition
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
    e?.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || submitting) return

    if (listening) { recognitionRef.current?.stop(); setListening(false) }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/login'); return }

    const currentMood      = mood
    const currentInputType = inputType
    const userMsgId        = Date.now()
    const aiMsgId          = Date.now() + 1

    setMessages(prev => [
      ...prev,
      { id: userMsgId, type: 'user', content: trimmed, mood: currentMood },
      { id: aiMsgId,   type: 'ai',   content: '', loading: true },
    ])
    setContent('')
    setMood(null)
    setInputType('text')
    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch(`${API_BASE}/api/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content:    trimmed,
          user_id:    session.user.id,
          mood:       currentMood,
          input_type: currentInputType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error('save failed')
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId ? { ...m, content: data.ai_response || '', loading: false } : m
      ))
      await refreshStats(session.user.id)
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId ? { ...m, loading: false, error: true } : m
      ))
      setSubmitError('Could not save. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const firstName    = user?.user_metadata?.full_name?.split(' ')[0]
  const greetingBody = writtenToday
    ? "You've written today. Reflect has read it and has some thoughts. As usual."
    : "You haven't written today yet. Your future self is taking notes, but no pressure."

  return (
    <div className="bg-bg flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      <Navbar />

      {/* Scrollable chat area */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {messages.length === 0 ? (
          /* Empty state — greeting + stats + prompt hint */
          <div className="max-w-[680px] mx-auto px-6 pt-10 pb-6">
            <div className="mb-8">
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

            <div className="flex items-center gap-8 text-sm pt-4 border-t border-border mb-10">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-lg text-text">{stats.streak}</span>
                <span className="text-secondary">day streak</span>
              </div>
              <div className="flex items-center gap-1.5">
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
                className="hidden sm:inline ml-auto text-gold hover:underline transition-opacity"
                aria-label="View entry history"
              >
                History →
              </Link>
            </div>

            <p
              aria-live="polite"
              className={`text-secondary text-sm italic select-none transition-opacity duration-300 ${
                promptFading ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {PROMPTS[promptIndex]}
            </p>
          </div>
        ) : (
          /* Chat messages */
          <div className="max-w-[680px] mx-auto px-4 pt-6 pb-4 flex flex-col gap-4">
            {messages.map(msg =>
              msg.type === 'user'
                ? <UserBubble key={msg.id} msg={msg} />
                : <AIBubble   key={msg.id} msg={msg} />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

      </div>

      {/* Sticky input bar */}
      <div className="shrink-0 bg-bg border-t border-border pb-16 sm:pb-0">
        <div className="max-w-[680px] mx-auto px-4 pt-3 pb-3">

          {submitError && (
            <p className="text-error text-xs mb-2" role="alert">{submitError}</p>
          )}

          {/* Mood pills — horizontal scroll, no visible scrollbar */}
          <div
            className="flex gap-2 overflow-x-auto no-scrollbar mb-2 pb-1"
            role="group"
            aria-label="Select your mood"
          >
            {MOODS.map(({ label, emoji }) => (
              <button
                key={label}
                type="button"
                onClick={() => setMood(prev => prev === label ? null : label)}
                aria-pressed={mood === label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors shrink-0 ${
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

          {/* Textarea row */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              placeholder={messages.length === 0 ? PROMPTS[promptIndex] : 'Write anything…'}
              rows={1}
              style={{ maxHeight: 120 }}
              className="flex-1 bg-elevated border border-muted/40 rounded-2xl px-4 py-2.5 text-text placeholder:text-muted text-sm leading-relaxed focus:border-gold focus:outline-none transition-colors resize-none overflow-y-auto"
              aria-label="Journal entry"
            />

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Voice */}
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={listening ? 'Stop recording' : 'Start voice entry'}
                className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors ${
                  listening
                    ? 'bg-error border-error text-bg animate-pulse'
                    : 'border-border text-secondary hover:text-text hover:border-muted'
                }`}
              >
                {listening ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                    <rect width="10" height="10" rx="1"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-1 17.93V22H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A8.001 8.001 0 0 0 20 12a1 1 0 1 0-2 0 6 6 0 0 1-12 0 1 1 0 1 0-2 0 8.001 8.001 0 0 0 7 7.93z"/>
                  </svg>
                )}
              </button>

              {/* Send */}
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                aria-label="Send entry"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gold text-bg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </form>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}
