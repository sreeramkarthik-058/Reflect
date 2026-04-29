import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import ChatUI from '../components/ChatUI'

const MOOD_LABEL = { 5: 'Happy', 4: 'Grateful', 3: 'Neutral', 2: 'Stressed', 1: 'Anxious' }

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

async function insightsFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`http://localhost:3001/api/insights${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...(options.headers || {}),
    },
  })
  return res.json()
}

function MoodGraph({ series }) {
  if (!series || series.length < 2) {
    return (
      <div className="flex items-center justify-center h-[100px] text-muted text-sm italic">
        Not enough data yet — keep writing!
      </div>
    )
  }

  const W = 480
  const H = 120
  const PL = 8
  const PR = 8
  const PT = 18
  const PB = 22
  const innerW = W - PL - PR
  const innerH = H - PT - PB

  const pts = series.map((d, i) => ({
    x: PL + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW),
    y: PT + (1 - (d.value - 1) / 4) * innerH,
    ...d,
  }))

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')

  const maxV  = Math.max(...pts.map(p => p.value))
  const minV  = Math.min(...pts.map(p => p.value))
  const peakPt = pts.find(p => p.value === maxV)
  const lowPt  = [...pts].reverse().find(p => p.value === minV)
  const showLow = lowPt && lowPt !== peakPt && lowPt.value < maxV

  const clampX = (x) => Math.min(Math.max(x, 30), W - 30)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Mood over the last 30 days" role="img">
      {[1, 2, 3, 4, 5].map(v => {
        const y = PT + (1 - (v - 1) / 4) * innerH
        return <line key={v} x1={PL} y1={y} x2={W - PR} y2={y} stroke="#2A2520" strokeWidth="1" />
      })}

      <polyline points={polyline} fill="none" stroke="#D4A96A" strokeWidth="1.5" strokeLinejoin="round" />

      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#D4A96A" />)}

      {peakPt && (
        <text x={clampX(peakPt.x)} y={peakPt.y - 7} textAnchor="middle" fontSize="10" fill="#D4A96A">
          {MOOD_LABEL[peakPt.value]}
        </text>
      )}
      {showLow && (
        <text x={clampX(lowPt.x)} y={lowPt.y + 15} textAnchor="middle" fontSize="10" fill="#5C5650">
          {MOOD_LABEL[lowPt.value]}
        </text>
      )}

      <text x={PL} y={H} textAnchor="start" fontSize="9" fill="#5C5650">{pts[0].date.slice(5)}</text>
      <text x={W - PR} y={H} textAnchor="end" fontSize="9" fill="#5C5650">{pts[pts.length - 1].date.slice(5)}</text>
    </svg>
  )
}

function getTrend(moodSeries) {
  if (!moodSeries || moodSeries.length < 4) return null
  const last7 = moodSeries.slice(-7)
  const prev7 = moodSeries.slice(-14, -7)
  if (!last7.length || !prev7.length) return null
  const avg = arr => arr.reduce((s, d) => s + d.value, 0) / arr.length
  const diff = avg(last7) - avg(prev7)
  if (Math.abs(diff) < 0.3) return null
  return diff > 0 ? 'up' : 'down'
}

export default function Insights() {
  const [stats, setStats]           = useState(null)
  const [statsError, setStatsError] = useState('')
  const [digest, setDigest]         = useState(null)
  const [digestLoading, setDigestLoading] = useState(false)
  const [digestError, setDigestError]     = useState('')

  const [chatOpen, setChatOpen]       = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    loadStats()
    loadDigest()
  }, [])

  async function loadStats() {
    try {
      const data = await insightsFetch('/stats')
      if (data.error) { setStatsError('Could not load insights.'); return }
      setStats(data)
    } catch {
      setStatsError('Could not load insights.')
    }
  }

  async function loadDigest() {
    setDigestLoading(true)
    setDigestError('')
    try {
      const data = await insightsFetch('/digest', { method: 'POST', body: '{}' })
      if (data.error) { setDigestError('Could not generate digest.'); return }
      setDigest(data)
    } catch {
      setDigestError('Could not generate digest.')
    } finally {
      setDigestLoading(false)
    }
  }

  async function handleChatSend(text) {
    const next = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(next)
    setChatLoading(true)
    try {
      const data = await insightsFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: next }),
      })
      if (data.response) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      }
    } catch { /* silent */ } finally {
      setChatLoading(false)
    }
  }

  const trend = getTrend(stats?.mood_series)

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      <Navbar />

      {/* Main */}
      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-10 pb-24 sm:pb-10">

        <div className="mb-8">
          <h1 className="font-heading text-3xl text-text mb-1">Insights</h1>
          <p className="text-secondary text-sm">Patterns and reflections from your journal.</p>
        </div>

        {statsError && <p className="text-error text-sm mb-6" role="alert">{statsError}</p>}

        {/* Streak + total — F25 */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-elevated border border-border rounded px-4 py-4">
              <div className="font-mono text-3xl text-gold mb-1">{stats.streak}</div>
              <div className="text-secondary text-sm">day streak</div>
            </div>
            <div className="bg-elevated border border-border rounded px-4 py-4">
              <div className="font-mono text-3xl text-text mb-1">{stats.total_entries}</div>
              <div className="text-secondary text-sm">total entries</div>
            </div>
          </div>
        )}

        {/* Mood graph — F26 */}
        {stats && (
          <div className="bg-elevated border border-border rounded px-4 pt-4 pb-3 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-text">Mood — last 30 days</h2>
              {trend && (
                <span className={`text-xs ${trend === 'up' ? 'text-success' : 'text-error'}`}>
                  {trend === 'up' ? '↑ improving' : '↓ declining'}
                </span>
              )}
            </div>
            <MoodGraph series={stats.mood_series} />
          </div>
        )}

        {/* Weekly digest — F27 */}
        <div className="bg-elevated border border-border rounded px-4 py-4 mb-6">
          <h2 className="text-sm font-medium text-text mb-3">This week</h2>
          {digestLoading && (
            <p className="text-muted text-sm italic animate-pulse">Generating your weekly digest…</p>
          )}
          {digestError && <p className="text-error text-sm" role="alert">{digestError}</p>}
          {!digestLoading && digest !== null && (
            digest.digest
              ? <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">{renderMarkdown(digest.digest)}</p>
              : (
                <p className="text-muted text-sm italic">
                  Write at least 3 entries this week to get a digest.
                  {digest.entry_count > 0 && ` You've written ${digest.entry_count} so far.`}
                </p>
              )
          )}
        </div>

        {/* Ask My Journal — F28 */}
        <div className="mt-2">
          <Link
            to="/ask"
            className="sm:hidden text-sm text-secondary hover:text-gold transition-colors"
          >
            Ask your journal anything →
          </Link>
          <button
            onClick={() => setChatOpen(true)}
            className="hidden sm:inline text-sm text-secondary hover:text-gold transition-colors"
          >
            Ask your journal anything →
          </button>
        </div>

      </main>

      {/* Chat drawer — desktop only */}
      {chatOpen && (
        <>
          <div
            className="hidden sm:block fixed inset-0 bg-bg/60 z-40"
            onClick={() => setChatOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="hidden sm:flex fixed right-0 top-0 bottom-0 w-[400px] bg-surface border-l border-border flex-col z-50"
            aria-label="Ask My Journal chat"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
              <h2 className="font-medium text-text text-sm">Ask My Journal</h2>
              <button
                onClick={() => setChatOpen(false)}
                className="text-secondary hover:text-text transition-colors text-lg leading-none"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ChatUI
                messages={chatMessages}
                onSend={handleChatSend}
                loading={chatLoading}
                onClear={() => setChatMessages([])}
              />
            </div>
          </aside>
        </>
      )}

      <BottomNav />
    </div>
  )
}
