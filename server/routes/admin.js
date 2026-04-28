const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

// Service role client — DB queries, auth.admin.* operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Publishable key client — used only for signInWithPassword
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY
)

async function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' })

  const { data: roleRow } = await supabaseAdmin
    .from('user_roles')
    .select('role, status')
    .eq('user_id', user.id)
    .single()

  if (!roleRow || roleRow.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  req.adminUser = user
  next()
}

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const { data: roleRow } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .single()

  if (!roleRow || roleRow.role !== 'admin') {
    return res.status(403).json({ error: 'This account does not have admin access' })
  }

  res.json({
    access_token: data.session.access_token,
    user: { id: data.user.id, email: data.user.email },
  })
})

// GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
  if (usersError) {
    console.error('[Admin] listUsers error:', usersError)
    return res.status(500).json({ error: 'Failed to fetch users' })
  }

  const { data: entryCounts } = await supabaseAdmin
    .from('entries')
    .select('user_id, created_at')

  const { data: roles } = await supabaseAdmin
    .from('user_roles')
    .select('user_id, role, status')

  const countMap = {}
  const lastActiveMap = {}
  for (const e of entryCounts || []) {
    countMap[e.user_id] = (countMap[e.user_id] || 0) + 1
    if (!lastActiveMap[e.user_id] || e.created_at > lastActiveMap[e.user_id]) {
      lastActiveMap[e.user_id] = e.created_at
    }
  }

  const roleMap = {}
  for (const r of roles || []) roleMap[r.user_id] = r

  res.json(users.map(u => ({
    id: u.id,
    email: u.email,
    full_name: u.user_metadata?.full_name || null,
    created_at: u.created_at,
    role: roleMap[u.id]?.role || null,
    status: roleMap[u.id]?.status || 'active',
    entry_count: countMap[u.id] || 0,
    last_active: lastActiveMap[u.id] || null,
  })))
})

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body
  if (!['active', 'disabled', 'deactivated'].includes(status)) {
    return res.status(400).json({ error: 'status must be active, disabled, or deactivated' })
  }

  const { error } = await supabaseAdmin
    .from('user_roles')
    .update({ status })
    .eq('user_id', req.params.id)

  if (error) {
    console.error('[Admin] status update error:', error)
    return res.status(500).json({ error: 'Failed to update status' })
  }

  res.json({ user_id: req.params.id, status })
})

// GET /api/admin/users/:id/notes
router.get('/users/:id/notes', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('admin_notes')
    .select('*')
    .eq('user_id', req.params.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Admin] fetch notes error:', error)
    return res.status(500).json({ error: 'Failed to fetch notes' })
  }

  res.json(data || [])
})

// POST /api/admin/users/:id/notes
router.post('/users/:id/notes', requireAdmin, async (req, res) => {
  const { content } = req.body
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' })

  const { data, error } = await supabaseAdmin
    .from('admin_notes')
    .insert({
      user_id: req.params.id,
      content: content.trim(),
      created_by: req.adminUser.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[Admin] add note error:', error)
    return res.status(500).json({ error: 'Failed to save note' })
  }

  res.status(201).json(data)
})

// GET /api/admin/activity-logs
router.get('/activity-logs', requireAdmin, async (req, res) => {
  const { user_id, event_type, from, to } = req.query

  let query = supabaseAdmin
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (user_id) query = query.eq('user_id', user_id)
  if (event_type) query = query.eq('event_type', event_type)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, error } = await query
  if (error) {
    console.error('[Admin] activity-logs error:', error)
    return res.status(500).json({ error: 'Failed to fetch activity logs' })
  }

  res.json(data || [])
})

// ── Streak helpers (shared with metrics route) ────────────────────────────────

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

// ── Cost constants ────────────────────────────────────────────────────────────
// Haiku pricing: $0.80/M input tokens, $4.00/M output tokens.
// Split assumption: 75% input (system prompt + entry), 25% output (AI response).

const INPUT_COST_PER_M  = 0.80
const OUTPUT_COST_PER_M = 4.00
const INPUT_FRACTION    = 0.75
const OUTPUT_FRACTION   = 0.25

function tokensToCost(tokens) {
  return tokens * (
    INPUT_FRACTION  * (INPUT_COST_PER_M  / 1_000_000) +
    OUTPUT_FRACTION * (OUTPUT_COST_PER_M / 1_000_000)
  )
}

// GET /api/admin/metrics
router.get('/metrics', requireAdmin, async (req, res) => {
  const [usersResult, entriesResult] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers(),
    supabaseAdmin.from('entries').select('user_id, created_at, input_type'),
  ])

  if (usersResult.error) {
    console.error('[Admin] metrics listUsers error:', usersResult.error)
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
  if (entriesResult.error) {
    console.error('[Admin] metrics entries error:', entriesResult.error)
    return res.status(500).json({ error: 'Failed to fetch entries' })
  }

  const users      = usersResult.data.users
  const allEntries = entriesResult.data || []

  // ── Total users ──
  const totalUsers = users.length

  // ── DAU ──
  const todayMs = dayKey(new Date())
  const dau = new Set(
    allEntries.filter(e => dayKey(e.created_at) === todayMs).map(e => e.user_id)
  ).size

  // ── Entries per day (last 7 days) ──
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const countByDay = {}
  for (const e of allEntries) {
    if (new Date(e.created_at) >= sevenDaysAgo) {
      const key = e.created_at.slice(0, 10)
      countByDay[key] = (countByDay[key] || 0) + 1
    }
  }
  const entriesPerDay = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    entriesPerDay.push({ date: key, count: countByDay[key] || 0 })
  }

  // ── Voice vs text ──
  const inputTypeCounts = {}
  for (const e of allEntries) {
    const t = e.input_type || 'text'
    inputTypeCounts[t] = (inputTypeCounts[t] || 0) + 1
  }

  // ── Streak distribution ──
  const entriesByUser = {}
  for (const e of allEntries) {
    if (!entriesByUser[e.user_id]) entriesByUser[e.user_id] = []
    entriesByUser[e.user_id].push(e)
  }

  const usersWithEntries = new Set(Object.keys(entriesByUser))
  const streakDist = { zero: 0, low: 0, mid: 0, high: 0 }

  for (const userEntries of Object.values(entriesByUser)) {
    const s = calcStreak(userEntries)
    if (s === 0)       streakDist.zero++
    else if (s <= 3)   streakDist.low++
    else if (s <= 7)   streakDist.mid++
    else               streakDist.high++
  }
  streakDist.zero += users.filter(u => !usersWithEntries.has(u.id)).length

  // ── Retention cohorts ──
  const now = new Date()
  const usersWithAnyEntry = new Set(allEntries.map(e => e.user_id))

  function cohortStats(daysAgoStart, daysAgoEnd) {
    const end = new Date(now)
    end.setDate(end.getDate() - daysAgoStart)
    end.setHours(23, 59, 59, 999)
    const start = new Date(now)
    start.setDate(start.getDate() - daysAgoEnd)
    start.setHours(0, 0, 0, 0)

    const cohortUsers = users.filter(u => {
      const joined = new Date(u.created_at)
      return joined >= start && joined <= end
    })
    const retained = cohortUsers.filter(u => usersWithAnyEntry.has(u.id)).length
    return {
      total:    cohortUsers.length,
      retained,
      pct: cohortUsers.length ? Math.round((retained / cohortUsers.length) * 100) : 0,
    }
  }

  res.json({
    total_users:         totalUsers,
    total_entries:       allEntries.length,
    dau,
    entries_per_day:     entriesPerDay,
    input_type:          inputTypeCounts,
    streak_distribution: streakDist,
    retention_cohorts: {
      this_week:  cohortStats(0,  6),
      last_week:  cohortStats(7,  13),
      last_month: cohortStats(14, 30),
    },
  })
})

// GET /api/admin/ai-costs
router.get('/ai-costs', requireAdmin, async (req, res) => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const { data: entries, error } = await supabaseAdmin
    .from('entries')
    .select('created_at, tokens_used')
    .not('tokens_used', 'is', null)
    .gte('created_at', thirtyDaysAgo.toISOString())

  if (error) {
    console.error('[Admin] ai-costs error:', error)
    return res.status(500).json({ error: 'Failed to fetch cost data' })
  }

  // Group by day
  const byDay = {}
  for (const e of entries || []) {
    const key = e.created_at.slice(0, 10)
    if (!byDay[key]) byDay[key] = { tokens: 0, entries: 0 }
    byDay[key].tokens  += e.tokens_used
    byDay[key].entries += 1
  }

  // Build 30-day array (oldest → newest)
  const perDay = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const row = byDay[key] || { tokens: 0, entries: 0 }
    perDay.push({ date: key, tokens: row.tokens, entries: row.entries, cost: tokensToCost(row.tokens) })
  }

  const now         = new Date()
  const todayKey    = now.toISOString().slice(0, 10)
  const weekAgoKey  = (() => { const d = new Date(now); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10) })()
  const monthKey    = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth  = now.getDate()

  let todayTokens = 0, weekTokens = 0, monthTokens = 0
  for (const row of perDay) {
    if (row.date === todayKey)          todayTokens  = row.tokens
    if (row.date >= weekAgoKey)         weekTokens  += row.tokens
    if (row.date.startsWith(monthKey))  monthTokens += row.tokens
  }

  const avgDailyTokens      = dayOfMonth > 0 ? monthTokens / dayOfMonth : 0
  const projectedMonthTokens = Math.round(avgDailyTokens * daysInMonth)

  res.json({
    per_day: perDay,
    today:           { tokens: todayTokens,          cost: tokensToCost(todayTokens) },
    week:            { tokens: weekTokens,            cost: tokensToCost(weekTokens) },
    month:           { tokens: monthTokens,           cost: tokensToCost(monthTokens) },
    projected_month: { tokens: projectedMonthTokens,  cost: tokensToCost(projectedMonthTokens) },
    assumptions: {
      input_fraction:    INPUT_FRACTION,
      output_fraction:   OUTPUT_FRACTION,
      input_cost_per_m:  INPUT_COST_PER_M,
      output_cost_per_m: OUTPUT_COST_PER_M,
    },
  })
})

module.exports = router
