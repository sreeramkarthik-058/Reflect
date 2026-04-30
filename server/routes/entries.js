const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')
const models = require('../../config/models')
const { JOURNAL_SYSTEM_PROMPT, JOURNAL_MOOD_SYSTEM_PROMPT } = require('../../config/prompts')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const anthropic = new Anthropic()

const VALID_MOODS = new Set(['Happy', 'Grateful', 'Neutral', 'Stressed', 'Anxious'])

router.post('/', async (req, res) => {
  const { content, user_id, mood, input_type } = req.body

  if (!content?.trim() || !user_id) {
    return res.status(400).json({ error: 'content and user_id are required' })
  }

  const { data: entry, error: insertError } = await supabase
    .from('entries')
    .insert({
      user_id,
      content:    content.trim(),
      input_type: input_type || 'text',
      mood:       mood || null,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[Reflect] insert error:', JSON.stringify(insertError, null, 2))
    return res.status(500).json({ error: 'Failed to save entry.' })
  }

  let aiResponse   = null
  let tokensUsed   = null
  let detectedMood = mood || null

  try {
    if (mood) {
      // User already picked a mood — plain text journal response only
      const message = await anthropic.messages.create({
        model:      models.journal,
        max_tokens: 150,
        system:     JOURNAL_SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: content.trim() }],
      })
      aiResponse = message.content[0].text
      tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0)
    } else {
      // No mood selected — single call returns JSON { response, mood }
      const message = await anthropic.messages.create({
        model:      models.journal,
        max_tokens: 200,
        system:     JOURNAL_MOOD_SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: content.trim() }],
      })
      const raw = message.content[0].text.trim()
      tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0)
      try {
        const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
        const parsed  = JSON.parse(jsonStr)
        aiResponse    = parsed.response || raw
        if (VALID_MOODS.has(parsed.mood)) detectedMood = parsed.mood
      } catch {
        // JSON parse failed — use raw text, skip mood detection
        aiResponse = raw
      }
    }
  } catch (err) {
    console.error('[Reflect] Claude error:', err.message ?? err)
  }

  if (aiResponse || (detectedMood && !mood)) {
    const updateData = {}
    if (aiResponse)              { updateData.ai_response = aiResponse; updateData.tokens_used = tokensUsed }
    if (detectedMood && !mood)     updateData.mood = detectedMood

    const { error: updateError } = await supabase
      .from('entries')
      .update(updateData)
      .eq('id', entry.id)

    if (updateError) {
      console.error('[Reflect] update error:', JSON.stringify(updateError, null, 2))
    } else {
      if (updateData.ai_response) { entry.ai_response = aiResponse; entry.tokens_used = tokensUsed }
      if (updateData.mood)          entry.mood = detectedMood
    }
  }

  res.status(201).json(entry)
})

module.exports = router
