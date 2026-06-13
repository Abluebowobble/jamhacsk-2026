import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { requireAuth } from './middleware/auth.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// All /api routes require a valid Supabase JWT
app.use('/api', requireAuth)

app.get('/api/me', (req, res) => {
  res.json({ user: req.user })
})

// TODO: mount route files as features are built:
// import householdsRouter from './routes/households.js'
// import devicesRouter from './routes/devices.js'
// import timersRouter from './routes/timers.js'
// import eventsRouter from './routes/events.js'
// import pushRouter from './routes/push.js'
// app.use('/api/households', householdsRouter)
// app.use('/api/devices', devicesRouter)
// app.use('/api/timers', timersRouter)
// app.use('/api/push', pushRouter)

app.listen(PORT, () => {
  console.log(`Hestia backend running on port ${PORT}`)
})
