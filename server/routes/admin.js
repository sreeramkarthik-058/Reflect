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

module.exports = router
