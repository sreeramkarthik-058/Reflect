const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')
const models = require('../../config/models')
const { DIGEST_SYSTEM_PROMPT, ASK_SYSTEM_PROMPT } = require('../../config/prompts')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const anthropic = new Anthropic()

const MOOD_VALUE = { Happy: 5, Grateful: 4, Neutral: 3, Stressed: 2, Anxious: 1 }
const DAY_MS = 86_400_000

async function requireUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = user
  next()
}

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

// GET /api/insights/stats — streak + mood series (last 30 days)
router.get('/stats', requireUser, async (req, res) => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const { data: entries, error } = await supabase
    .from('entries')
    .select('created_at, mood')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Insights] stats error:', error)
    return res.status(500).json({ error: 'Failed to fetch stats' })
  }

  const all = entries || []

  // Mood series: one point per day within last 30 days (most recent entry per day)
  const moodByDay = {}
  for (const e of all) {
    if (!e.mood) continue
    const d = new Date(e.created_at)
    if (d < thirtyDaysAgo) continue
    const key = e.created_at.slice(0, 10)
    if (!moodByDay[key]) moodByDay[key] = e.mood // first = most recent (sorted desc)
  }

  const moodSeries = Object.entries(moodByDay)
    .map(([date, mood]) => ({ date, mood, value: MOOD_VALUE[mood] }))
    .sort((a, b) => a.date.localeCompare(b.date))

  res.json({
    streak:        calcStreak(all),
    total_entries: all.length,
    mood_series:   moodSeries,
  })
})

// POST /api/insights/digest — weekly AI digest
router.post('/digest', requireUser, async (req, res) => {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const { data: entries, error } = await supabase
    .from('entries')
    .select('content, mood, created_at')
    .eq('user_id', req.user.id)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Insights] digest fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch entries' })
  }

  if (!entries || entries.length < 3) {
    return res.json({ digest: null, entry_count: entries?.length ?? 0 })
  }

  const entryText = entries.map((e, i) => {
    const d = new Date(e.created_at).toLocaleDateString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric',
    })
    return `Entry ${i + 1} (${d}${e.mood ? ', ' + e.mood : ''}): ${e.content}`
  }).join('\n\n')

  try {
    const message = await anthropic.messages.create({
      model:      models.journal,
      max_tokens: 400,
      system:     DIGEST_SYSTEM_PROMPT,
      messages: [{
        role:    'user',
        content:
          `Analyze these journal entries and respond in EXACTLY this format with no deviation:\n\n` +
          `OPENING: [One sentence observation about the week]\n\n` +
          `PATTERNS:\n- [Pattern 1]\n- [Pattern 2]\n- [Pattern 3]\n\n` +
          `CONCEPT: [Psychology concept name] — [one sentence plain English explanation]\n\n` +
          `QUESTION: [One closing question]\n\n` +
          `Journal entries:\n${entryText}`,
      }],
    })
    res.json({ digest: message.content[0].text, entry_count: entries.length })
  } catch (err) {
    console.error('[Insights] digest Claude error:', err.message)
    return res.status(500).json({ error: 'Failed to generate digest' })
  }
})

// POST /api/insights/chat — conversational Q&A over the journal
router.post('/chat', requireUser, async (req, res) => {
  const { messages } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  const { data: entries, error } = await supabase
    .from('entries')
    .select('content, mood, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('[Insights] chat fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch entries' })
  }

  const journalContext = (entries || [])
    .reverse()
    .map(e => {
      const d = new Date(e.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      const content = e.content.slice(0, 300)
      return `[${d}${e.mood ? ', ' + e.mood : ''}] ${content}`
    })
    .join('\n\n')

  const systemPrompt = ASK_SYSTEM_PROMPT +
    (journalContext ? `\n\nJournal entries (oldest to newest):\n\n${journalContext}` : '')

  try {
    const message = await anthropic.messages.create({
      model:      models.journal,
      max_tokens: 250,
      system:     systemPrompt,
      messages:   messages.map(m => ({ role: m.role, content: m.content })),
    })
    res.json({ response: message.content[0].text })
  } catch (err) {
    console.error('[Insights] chat Claude error:', err.message)
    return res.status(500).json({ error: 'Failed to generate response' })
  }
})

module.exports = router
