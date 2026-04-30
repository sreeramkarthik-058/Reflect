require('dotenv').config()
const express = require('express')
const cors = require('cors')

const entriesRouter  = require('./routes/entries')
const adminRouter    = require('./routes/admin')
const insightsRouter = require('./routes/insights')

const app = express()
const PORT = process.env.PORT || 3001

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: ALLOWED_ORIGIN }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/entries',  entriesRouter)
app.use('/api/admin',    adminRouter)
app.use('/api/insights', insightsRouter)

app.listen(PORT, () => {
  console.log(`Reflect server running on port ${PORT}`)
})
