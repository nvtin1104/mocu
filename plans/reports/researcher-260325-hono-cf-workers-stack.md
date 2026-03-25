# Hono + Cloudflare Workers Stack Research Report

## 1. Hono Framework on CF Workers

### Project Setup
```bash
npm create hono@latest -- --template cloudflare-workers my-project
cd my-project
npm install
```

**Key Points:**
- Ultra-lightweight, built on Web Standards
- ~13KB gzipped (faster than Express/Fastify)
- RegExpRouter as default (fastest in JS ecosystem)
- Full TypeScript support with Wrangler transpiler

### Routing Structure (REST API)
```typescript
import { Hono } from 'hono'

const app = new Hono()

// Basic routing
app.get('/users/:id', (c) => c.json({ userId: c.req.param('id') }))
app.post('/users', (c) => c.json({ created: true }))
app.delete('/users/:id', (c) => c.json({ deleted: true }))

// Router groups
const api = new Hono()
api.get('/status', (c) => c.json({ status: 'ok' }))
app.route('/api/v1', api)

export default app
```

**Best Patterns:**
- Use route grouping with `app.route()` for clean APIs
- Path parameters: `c.req.param('id')`
- Query params: `c.req.query('key')`
- Use SmartRouter or LinearRouter for rapid development

### Middleware Stack (Recommended Order)

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { bearerAuth } from 'hono/bearer-auth'
import { getRateLimitStore } from '@hono-rate-limiter/cloudflare'
import { rateLimiter } from 'hono-rate-limiter'

const app = new Hono()

// 1. Logging first (captures all requests)
app.use(logger())

// 2. CORS (must be early)
app.use(cors({
  origin: /\.yourdomain\.com$/,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}))

// 3. Rate limiting (before auth to prevent enumeration attacks)
const store = getRateLimitStore()
app.use('*', rateLimiter({ store, skip: (c) => c.req.path === '/health' }))

// 4. Authentication (protect routes)
app.use('/api/*', bearerAuth({ token: c.env.API_TOKEN }))

// 5. Error handler (catch all)
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  return c.json({ error: err.message }, 500)
})

export default app
```

**Rate Limiting Details:**
- Use Durable Objects for distributed rate limiting (production)
- Per-IP: `getRateLimitStore()` from `@hono-rate-limiter/cloudflare`
- Custom keys: `store.incr(key)` for per-user/chat limits
- Recommend: 100-1000 req/min depending on tier

---

## 2. Cloudflare D1 (SQLite)

### Schema & Migrations
D1 uses `.sql` files in `./migrations` folder. Create one per version:

```sql
-- migrations/0001_init.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  telegram_id TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
```

Deploy with: `wrangler d1 migrations apply --remote`

### Hono + D1 Query Patterns

```typescript
import { Hono } from 'hono'

type Bindings = { DB: D1Database }

const app = new Hono<{ Bindings }>()

// Single row
app.get('/users/:id', async (c) => {
  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(c.req.param('id'))
    .first()
  return c.json(user)
})

// Multiple rows
app.get('/users', async (c) => {
  const users = await c.env.DB
    .prepare('SELECT * FROM users LIMIT 100')
    .all()
  return c.json(users.results)
})

// Insert with validation
app.post('/users', async (c) => {
  const body = await c.req.json()
  const result = await c.env.DB
    .prepare('INSERT INTO users (telegram_id) VALUES (?)')
    .bind(body.telegram_id)
    .run()
  return c.json({ id: result.meta.last_row_id }, 201)
})

// Transactions (for atomicity)
const stmt = c.env.DB.prepare('INSERT INTO users VALUES (?, ?)')
await c.env.DB.batch([
  stmt.bind(1, 'user1'),
  stmt.bind(2, 'user2')
])
```

### Connection & Error Handling
- D1 automatically manages connections (no pooling config needed)
- Each query has timeout; wrap with try-catch for client timeout errors
- Use batch() for bulk operations (better perf than individual queries)
- Free tier: 10M reads/writes daily (enforced Feb 2025+)

---

## 3. Authentication Strategies

### JWT Token Auth (MVP)
```typescript
import { sign, verify } from 'hono/jwt'

const app = new Hono<{ Bindings: { JWT_SECRET: string } }>()

// Login: Generate JWT
app.post('/login', async (c) => {
  const { telegram_id } = await c.req.json()

  const token = await sign(
    { sub: telegram_id, exp: Math.floor(Date.now() / 1000) + 3600 },
    c.env.JWT_SECRET
  )

  // Optionally store in D1
  await c.env.DB.prepare(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).bind(telegram_id, token, new Date(Date.now() + 3600000))
   .run()

  return c.json({ token })
})

// Verify on protected routes
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const token = authHeader.replace('Bearer ', '')
    const payload = await verify(token, c.env.JWT_SECRET)
    c.set('user_id', payload.sub)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
```

### Telegram Chat ID Auth
```typescript
// Login endpoint: User provides chat_id
app.post('/auth/telegram', async (c) => {
  const { chat_id } = await c.req.json()

  // Verify via Telegram Bot API (optional: OTP flow)
  const verified = await verifyChatId(chat_id, c.env.BOT_TOKEN)
  if (!verified) return c.json({ error: 'Invalid chat' }, 401)

  // Create/get user
  let user = await c.env.DB
    .prepare('SELECT id FROM users WHERE telegram_id = ?')
    .bind(chat_id)
    .first()

  if (!user) {
    const result = await c.env.DB
      .prepare('INSERT INTO users (telegram_id) VALUES (?)')
      .bind(chat_id)
      .run()
    user = { id: result.meta.last_row_id }
  }

  // Issue JWT
  const token = await sign({ sub: chat_id, uid: user.id }, c.env.JWT_SECRET)
  return c.json({ token, expires_in: 3600 })
})
```

### Session Management with KV
```typescript
// Use KV for fast session lookups
app.post('/login', async (c) => {
  const { telegram_id } = await c.req.json()
  const sessionId = crypto.randomUUID()

  // Store in KV (TTL 24h)
  await c.env.SESSIONS.put(
    `session:${sessionId}`,
    JSON.stringify({ user_id: telegram_id, created: Date.now() }),
    { expirationTtl: 86400 }
  )

  return c.json({ session_id: sessionId })
})

// Verify session
app.use('/api/*', async (c, next) => {
  const sessionId = c.req.header('X-Session-ID')
  const session = await c.env.SESSIONS.get(`session:${sessionId}`, 'json')

  if (!session) return c.json({ error: 'Session expired' }, 401)
  c.set('user_id', session.user_id)
  await next()
})
```

**Recommendation:** JWT for stateless, KV for distributed session cache (hybrid approach).

---

## 4. Deployment & Configuration

### Wrangler.toml Structure
```toml
name = "my-api"
type = "service"
main = "src/index.ts"
compatibility_date = "2025-03-25"

[env.production]
name = "my-api-prod"
route = "api.yourdomain.com/*"

[env.staging]
name = "my-api-staging"
route = "api-staging.yourdomain.com/*"

# Environment variables (visible in logs, use for non-sensitive)
[vars]
API_VERSION = "1.0.0"
LOG_LEVEL = "info"

# D1 Binding
[[d1_databases]]
binding = "DB"
database_name = "main-db"
database_id = "abc123xyz"

# KV Binding for sessions
[[kv_namespaces]]
binding = "SESSIONS"
id = "xyz789abc"
preview_id = "xyz789abc-preview"

# Durable Objects (for rate limiting)
[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"

# Triggers (cron jobs)
[triggers]
crons = ["0 0 * * *"]
```

### Secrets Management
Secrets stored separately, never in config file:

```bash
# Local development (.dev.vars - DO NOT COMMIT)
JWT_SECRET=your-secret-key-here
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
DATABASE_URL=file:./db.sqlite

# Deploy to production
wrangler secret put JWT_SECRET --env production
wrangler secret put TELEGRAM_BOT_TOKEN --env production

# Environment-specific secrets
wrangler secret put API_KEY --env staging
```

### Deployment Steps
```bash
# Install dependencies
npm install

# Local testing
wrangler dev

# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production

# View logs
wrangler tail --env production
```

---

## 5. Testing & Debugging

### Unit Testing with Vitest
```typescript
import { describe, it, expect } from 'vitest'
import app from './index'

describe('GET /api/users/:id', () => {
  it('should return user', async () => {
    const res = await app.request(new Request('http://localhost/api/users/1'))
    expect(res.status).toBe(200)
  })

  it('should reject unauthorized', async () => {
    const res = await app.request(
      new Request('http://localhost/api/protected', {
        headers: { Authorization: 'Bearer invalid' }
      })
    )
    expect(res.status).toBe(401)
  })
})

// With mocked bindings
it('should query D1', async () => {
  const mockDB = {
    prepare: () => ({
      bind: () => ({
        first: async () => ({ id: 1, telegram_id: '123' })
      })
    })
  }

  const res = await app.request(
    new Request('http://localhost/api/users/1'),
    { DB: mockDB }
  )
  expect(res.status).toBe(200)
})
```

### Local Development
```bash
# Start dev server (http://localhost:8787)
wrangler dev

# With database
wrangler dev --local

# Debugging
# 1. Add breakpoints in VSCode
# 2. Inspector available at chrome://inspect
# 3. View logs in terminal
```

### Performance Best Practices
- Minimize cold start: tree-shake unused code, use esbuild
- Cache D1 queries in KV (60-300s TTL) for frequent reads
- Batch D1 writes: `db.batch([...])` vs individual queries
- Use Durable Objects only for distributed state (stateful rate limiting)
- Monitor: `wrangler analytics engine` for custom metrics

---

## 6. Complete MVP Example

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sign, verify } from 'hono/jwt'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  SESSIONS: KVNamespace
}

const app = new Hono<{ Bindings }>()

// Validation schemas
const LoginSchema = z.object({ telegram_id: z.string().min(1) })
const UserSchema = z.object({ id: z.number(), telegram_id: z.string() })

// Auth middleware
app.use('/api/*', async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    await verify(token, c.env.JWT_SECRET)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// Endpoints
app.post('/login', zValidator('json', LoginSchema), async (c) => {
  const { telegram_id } = c.req.valid('json')

  const user = await c.env.DB
    .prepare('SELECT id FROM users WHERE telegram_id = ?')
    .bind(telegram_id)
    .first<{ id: number }>()

  const token = await sign(
    { sub: telegram_id, exp: Math.floor(Date.now() / 1000) + 3600 },
    c.env.JWT_SECRET
  )

  return c.json({ token }, 200)
})

app.get('/api/users/:id', async (c) => {
  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(c.req.param('id'))
    .first<typeof UserSchema._type>()

  return user ? c.json(user) : c.json({ error: 'Not found' }, 404)
})

export default app
```

---

## Key Resources & Citations

- [Hono Cloudflare Workers Setup](https://hono.dev/docs/getting-started/cloudflare-workers)
- [Cloudflare D1 with Hono Examples](https://developers.cloudflare.com/d1/examples/d1-and-hono/)
- [Hono Middleware Documentation](https://hono.dev/docs/api/middleware)
- [Cloudflare Workers Secrets & Environment](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Hono Validation with Zod](https://hono.dev/docs/guides/validation)
- [Testing Hono with Vitest](https://hono.dev/examples/cloudflare-vitest)
- [Rate Limiting on Cloudflare Workers](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [JWT Authentication Guide](https://drcodes.com/posts/jwt-authentication-with-cloudflare-workers-complete-guide)
- [Telegram Bot Implementation](https://dev.to/msarabi/deploying-your-telegram-bots-on-cloudflare-workers-a-step-by-step-guide-3cdk)

---

## Unresolved Questions

1. **OTP Flow for Telegram Auth**: Should implement phone number verification via Telegram Bot API before issuing JWT? (Affects security posture for MVP)
2. **Rate Limit Granularity**: Per-IP vs per-user vs per-chat-id? Trade-offs for abuse prevention vs legitimate traffic?
3. **D1 Backup Strategy**: Best approach for data backup in production? (D1 handles it but migration path unclear)
4. **Session Invalidation**: Should JWT revocation list be maintained in KV for security? (Adds latency vs storage cost)
5. **Cost Optimization**: When to migrate from KV session storage to D1 as request volume grows?

---

**Report Generated**: 2026-03-25
**Status**: Research Complete - Ready for Implementation Phase
