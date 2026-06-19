const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

// Required Supabase setup — run once in the SQL editor:
//
// create table public.feedback (
//   id uuid primary key default gen_random_uuid(),
//   user_id uuid not null references auth.users(id),
//   rating integer not null check (rating between 1 and 5),
//   category text not null check (category in ('bug', 'feature_request', 'general')),
//   message text not null,
//   created_at timestamptz default now()
// );
// alter table public.feedback enable row level security;
// grant insert on public.feedback to authenticated;
// grant select, insert on public.feedback to service_role;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function requireUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = user
  next()
}

// POST /api/feedback
router.post('/', requireUser, async (req, res) => {
  const { rating, category, message } = req.body

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' })
  }
  if (!['bug', 'feature_request', 'general'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' })
  }
  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' })
  }

  const { data, error } = await supabase
    .from('feedback')
    .insert({ user_id: req.user.id, rating, category, message: message.trim() })
    .select()
    .single()

  if (error) {
    console.error('Feedback insert error:', error)
    return res.status(500).json({ error: 'Failed to save feedback' })
  }

  res.status(201).json(data)
})

module.exports = router
