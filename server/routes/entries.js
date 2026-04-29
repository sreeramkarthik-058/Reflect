const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')
const models = require('../../config/models')
const { JOURNAL_SYSTEM_PROMPT } = require('../../config/prompts')

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

  const [journalResult, moodResult] = await Promise.allSettled([
    anthropic.messages.create({
      model:      models.journal,
      max_tokens: 150,
      system:     JOURNAL_SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: content.trim() }],
    }),
    // Only auto-detect mood when the user didn't pick one manually
    mood ? Promise.resolve(null) : anthropic.messages.create({
      model:      models.journal,
      max_tokens: 5,
      messages:   [{
        role:    'user',
        content: `Classify the mood of this journal entry as exactly one word from: Happy, Grateful, Neutral, Stressed, Anxious. Reply with the single word only.\n\n${content.trim()}`,
      }],
    }),
  ])

  if (journalResult.status === 'fulfilled') {
    const msg = journalResult.value
    aiResponse = msg.content[0].text
    tokensUsed = (msg.usage?.input_tokens ?? 0) + (msg.usage?.output_tokens ?? 0)
  } else {
    console.error('[Reflect] Claude error:', journalResult.reason?.message ?? journalResult.reason)
  }

  if (moodResult.status === 'fulfilled' && moodResult.value) {
    const raw = moodResult.value.content[0].text.trim()
    if (VALID_MOODS.has(raw)) detectedMood = raw
    tokensUsed = (tokensUsed ?? 0) +
      (moodResult.value.usage?.input_tokens ?? 0) +
      (moodResult.value.usage?.output_tokens ?? 0)
  } else if (moodResult.status === 'rejected') {
    console.error('[Reflect] mood detection error:', moodResult.reason?.message ?? moodResult.reason)
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
