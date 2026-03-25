import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { Env } from './types'
import { jwtAuth } from './middleware/auth'
import authRouter from './routes/auth'
import notesRouter from './routes/notes'
import todosRouter from './routes/todos'
import telegramRouter from './routes/telegram'

const app = new Hono<{ Bindings: Env }>()

// === Middleware Stack ===
// 1. Logger - captures all requests
app.use(logger())

// 2. CORS - must be early
app.use(
  cors({
    origin: '*', // TODO: Restrict in production
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    maxAge: 86400
  })
)

// === Health Check ===
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: c.env.API_VERSION
  })
})

// === Public Routes ===
app.route('/auth', authRouter)
app.route('/api/telegram', telegramRouter)

// === Protected Routes ===
app.use('/api/*', jwtAuth)

app.route('/api/notes', notesRouter)
app.route('/api/todos', todosRouter)

// === Error Handler ===
app.onError((err, c) => {
  console.error('Error:', err)

  const message = err instanceof Error ? err.message : 'Internal server error'

  return c.json(
    {
      error: message,
      timestamp: new Date().toISOString()
    },
    500
  )
})

// === 404 Handler ===
app.notFound((c) => {
  return c.json(
    {
      error: 'Not found',
      path: c.req.path,
      method: c.req.method
    },
    404
  )
})

export default app
