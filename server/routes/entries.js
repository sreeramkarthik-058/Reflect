const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')
const models = require('../../config/models')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const anthropic = new Anthropic()

const SYSTEM_PROMPT =
  'You are Reflect, an AI journaling companion. You are witty, warm, and self-deprecating. ' +
  'You never say "I hear you", "That must be hard", or "Thank you for sharing". ' +
  'You sound like a smart friend who has read too much. ' +
  'Keep responses to 3-5 lines. End with one gentle question. ' +
  'Never start two responses the same way. ' +
  'If the entry signals genuine distress, drop the humour and respond with warmth only.'

router.post('/', async (req, res) => {
  const { content, user_id } = req.body
  console.log('[Reflect] POST /api/entries — body:', { content: content?.slice(0, 40), user_id })
  console.log('[Reflect] SUPABASE_URL:', process.env.SUPABASE_URL)
  console.log('[Reflect] SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  console.log('[Reflect] ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY)

  if (!content?.trim() || !user_id) {
    console.log('[Reflect] 400 — missing content or user_id')
    return res.status(400).json({ error: 'content and user_id are required' })
  }

  console.log('[Reflect] → attempting Supabase insert')
  const { data: entry, error: insertError } = await supabase
    .from('entries')
    .insert({ user_id, content: content.trim(), input_type: 'text' })
    .select()
    .single()

  if (insertError) {
    console.error('[Reflect] ✗ insert error:', JSON.stringify(insertError, null, 2))
    return res.status(500).json({ error: 'Failed to save entry.' })
  }
  console.log('[Reflect] ✓ insert ok — entry id:', entry.id)

  let aiResponse = null
  console.log('[Reflect] → calling Claude, model:', models.journal)
  try {
    const message = await anthropic.messages.create({
      model: models.journal,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: content.trim() }],
    })
    aiResponse = message.content[0].text
    console.log('[Reflect] ✓ Claude response received, length:', aiResponse.length)
  } catch (err) {
    console.error('[Reflect] ✗ Claude error:', err.message, err.status ?? '')
  }

  if (aiResponse) {
    console.log('[Reflect] → updating entry with ai_response')
    const { error: updateError } = await supabase
      .from('entries')
      .update({ ai_response: aiResponse })
      .eq('id', entry.id)

    if (updateError) {
      console.error('[Reflect] ✗ update error:', JSON.stringify(updateError, null, 2))
    } else {
      console.log('[Reflect] ✓ ai_response saved')
      entry.ai_response = aiResponse
    }
  }

  res.status(201).json(entry)
})

module.exports = router
