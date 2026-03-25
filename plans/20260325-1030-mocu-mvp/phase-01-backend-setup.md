# Phase 1: Backend Setup (Hono + D1 + Auth)

**Duration:** Days 1-5 | **Dependencies:** Cloudflare account | **Next:** Phase 2 & 3

## Overview

Set up Hono REST API on Cloudflare Workers with D1 database, JWT auth, and basic CRUD endpoints for notes & todos.

**Deliverables:**
- ✅ Hono app with middleware stack
- ✅ D1 schema (users, notes, todos tables)
- ✅ JWT + Telegram chat_id authentication
- ✅ Basic API endpoints (CRUD)
- ✅ Error handling & validation

## Context & Key Insights

**From Research:**
- Hono: Ultra-lightweight (~13KB), fastest routing on CF Workers
- D1: SQLite with automatic connection management, no pooling needed
- Auth: Hybrid JWT + KV session caching recommended
- Secrets: Never hardcode — use `wrangler secret put`
- Middleware order critical: logger → CORS → rate-limit → auth

## Requirements

### Infrastructure
- Cloudflare account (free tier sufficient)
- wrangler CLI v3.0+
- Node.js 18+
- npm/yarn

### Database Schema
```sql
users (id, telegram_chat_id, created_at)
notes (id, user_id, title, content, tags, is_archived, created_at, updated_at)
todos (id, user_id, title, description, status, priority, due_date, created_at, updated_at)
```

### API Endpoints Required
```
POST   /auth/telegram        # Login with chat_id
POST   /api/notes            # Create note
GET    /api/notes            # List notes
GET    /api/notes/:id        # Get note
PUT    /api/notes/:id        # Update note
DELETE /api/notes/:id        # Delete note

POST   /api/todos            # Create todo
GET    /api/todos            # List todos
GET    /api/todos/:id        # Get todo
PUT    /api/todos/:id        # Update todo
PATCH  /api/todos/:id/status # Mark done/pending
DELETE /api/todos/:id        # Delete todo
```

## Architecture

```
┌─────────────────────────────────────┐
│   Cloudflare Worker (Hono App)      │
├─────────────────────────────────────┤
│ Middleware Stack:                   │
│ 1. Logger                           │
│ 2. CORS                             │
│ 3. Rate Limit (per IP)              │
│ 4. Auth (JWT verification)          │
├─────────────────────────────────────┤
│ Routes:                             │
│ /auth/telegram → JWT generation     │
│ /api/notes/* → CRUD operations      │
│ /api/todos/* → CRUD operations      │
├─────────────────────────────────────┤
│ Bindings:                           │
│ - DB: D1 database                   │
│ - KV: Sessions cache                │
│ - Secrets: JWT_SECRET, etc          │
└─────────────────────────────────────┘
         ↓           ↓
    ┌────────┐  ┌─────────┐
    │   D1   │  │   KV    │
    └────────┘  └─────────┘
```

## Implementation Steps

### Step 1: Setup Project (Day 1)
```bash
npm create hono@latest -- --template cloudflare-workers mocu-api
cd mocu-api
npm install zod @hono/zod-validator hono-jwt
npm install -D vitest @cloudflare/workers-types
```

### Step 2: Create wrangler.toml
```toml
name = "mocu-api"
type = "service"
main = "src/index.ts"
compatibility_date = "2025-03-25"

[[d1_databases]]
binding = "DB"
database_name = "mocu-db"

[[kv_namespaces]]
binding = "KV"

[vars]
API_VERSION = "1.0.0"

# Run: wrangler secret put JWT_SECRET
# Run: wrangler secret put TELEGRAM_SECRET
```

### Step 3: Create D1 Schema (Day 2)
File: `migrations/0001_init.sql`
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  telegram_chat_id TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  is_archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);

CREATE TABLE todos (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
  due_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_todos_user ON todos(user_id);
CREATE INDEX idx_todos_status ON todos(status);
```

Deploy: `wrangler d1 migrations apply --remote`

### Step 4: Implement Auth Middleware (Day 2-3)
File: `src/middleware/auth.ts`
```typescript
import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'

export async function jwtAuth(c, next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const payload = await verify(token, c.env.JWT_SECRET)
    c.set('userId', payload.sub)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
}

export async function generateJWT(chatId: string, secret: string) {
  return await sign(
    { sub: chatId, exp: Math.floor(Date.now() / 1000) + 86400 },
    secret
  )
}
```

### Step 5: Build Routes (Day 3-4)
File: `src/index.ts`
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { generateJWT, jwtAuth } from './middleware/auth'

type Bindings = { DB: D1Database; KV: KVNamespace; JWT_SECRET: string }
const app = new Hono<{ Bindings }>()

// Middleware
app.use(logger())
app.use(cors({ origin: '*' }))

// Auth endpoint
const LoginSchema = z.object({ chat_id: z.string() })
app.post('/auth/telegram', zValidator('json', LoginSchema), async (c) => {
  const { chat_id } = c.req.valid('json')

  let user = await c.env.DB
    .prepare('SELECT id FROM users WHERE telegram_chat_id = ?')
    .bind(chat_id)
    .first()

  if (!user) {
    const result = await c.env.DB
      .prepare('INSERT INTO users (telegram_chat_id) VALUES (?)')
      .bind(chat_id)
      .run()
    user = { id: result.meta.last_row_id }
  }

  const token = await generateJWT(chat_id, c.env.JWT_SECRET)
  return c.json({ token, user_id: user.id }, 200)
})

// Protected routes
app.use('/api/*', jwtAuth)

// Notes CRUD
app.post('/api/notes', zValidator('json', z.object({ title: z.string(), content: z.string().optional() })), async (c) => {
  const userId = c.get('userId')
  const { title, content } = c.req.valid('json')

  const result = await c.env.DB
    .prepare('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)')
    .bind(userId, title, content || '')
    .run()

  return c.json({ id: result.meta.last_row_id, title }, 201)
})

app.get('/api/notes', async (c) => {
  const userId = c.get('userId')
  const notes = await c.env.DB
    .prepare('SELECT * FROM notes WHERE user_id = ? AND is_archived = 0 ORDER BY updated_at DESC')
    .bind(userId)
    .all()
  return c.json(notes.results || [])
})

app.get('/api/notes/:id', async (c) => {
  const userId = c.get('userId')
  const note = await c.env.DB
    .prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), userId)
    .first()
  return note ? c.json(note) : c.json({ error: 'Not found' }, 404)
})

app.put('/api/notes/:id', zValidator('json', z.object({ title: z.string().optional(), content: z.string().optional() })), async (c) => {
  const userId = c.get('userId')
  const { title, content } = c.req.valid('json')

  await c.env.DB
    .prepare('UPDATE notes SET title = COALESCE(?, title), content = COALESCE(?, content), updated_at = datetime("now") WHERE id = ? AND user_id = ?')
    .bind(title || null, content || null, c.req.param('id'), userId)
    .run()

  return c.json({ success: true })
})

app.delete('/api/notes/:id', async (c) => {
  const userId = c.get('userId')
  await c.env.DB
    .prepare('DELETE FROM notes WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), userId)
    .run()
  return c.json({ success: true })
})

// Todos CRUD (similar pattern)
app.post('/api/todos', zValidator('json', z.object({ title: z.string(), priority: z.enum(['low', 'medium', 'high']).optional() })), async (c) => {
  const userId = c.get('userId')
  const { title, priority } = c.req.valid('json')

  const result = await c.env.DB
    .prepare('INSERT INTO todos (user_id, title, priority) VALUES (?, ?, ?)')
    .bind(userId, title, priority || 'medium')
    .run()

  return c.json({ id: result.meta.last_row_id, title }, 201)
})

app.get('/api/todos', async (c) => {
  const userId = c.get('userId')
  const status = c.req.query('status') || 'pending'

  const todos = await c.env.DB
    .prepare('SELECT * FROM todos WHERE user_id = ? AND status = ? ORDER BY priority DESC, created_at DESC')
    .bind(userId, status)
    .all()

  return c.json(todos.results || [])
})

app.patch('/api/todos/:id/status', zValidator('json', z.object({ status: z.enum(['pending', 'in_progress', 'done']) })), async (c) => {
  const userId = c.get('userId')
  const { status } = c.req.valid('json')

  await c.env.DB
    .prepare('UPDATE todos SET status = ?, updated_at = datetime("now") WHERE id = ? AND user_id = ?')
    .bind(status, c.req.param('id'), userId)
    .run()

  return c.json({ success: true })
})

app.delete('/api/todos/:id', async (c) => {
  const userId = c.get('userId')
  await c.env.DB
    .prepare('DELETE FROM todos WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), userId)
    .run()
  return c.json({ success: true })
})

// Error handler
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message }, 500)
})

export default app
```

### Step 6: Setup Secrets & Deploy (Day 5)
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set secrets
wrangler secret put JWT_SECRET
wrangler secret put TELEGRAM_SECRET

# Deploy
wrangler deploy

# Test
curl https://mocu-api.YOUR-SUBDOMAIN.workers.dev/auth/telegram \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"123456789"}'
```

## Todo List

- [ ] Create Cloudflare account & setup wrangler
- [ ] Initialize Hono project
- [ ] Create D1 schema migration
- [ ] Implement auth middleware
- [ ] Build Notes endpoints (CRUD)
- [ ] Build Todos endpoints (CRUD)
- [ ] Add input validation with Zod
- [ ] Setup error handling
- [ ] Test locally with `wrangler dev`
- [ ] Deploy to production
- [ ] Verify API with curl/Postman

## Success Criteria

- [ ] All CRUD endpoints respond with correct status codes
- [ ] JWT validation blocks unauthorized requests
- [ ] Notes & Todos queries return user-specific data
- [ ] D1 schema migrations apply without errors
- [ ] Secrets are set correctly (no hardcoding)
- [ ] Error responses are consistent JSON format

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| D1 quota limits (10M daily) | Medium | Monitor usage, batch queries |
| JWT secret exposure | High | Use `wrangler secret put` only |
| Rate limiting not implemented | Medium | Add in Phase 2 |
| No transaction support initially | Low | Use batch() for multi-step operations |

## Security Considerations

- ✅ Secrets via environment only (never in code)
- ✅ JWT expiration set to 24h
- ✅ User ID validation on all protected routes
- ✅ SQL injection prevented (prepared statements)
- ⚠️ CORS: Currently allow all origins (restrict in Phase 4)
- ⚠️ Rate limiting: Defer to Phase 2

## Unresolved Questions (from research)

1. Session invalidation: Maintain JWT revocation list in KV?
2. OTP flow: Do we need phone verification before JWT?
3. D1 backup strategy: Automated backups available?
4. Multi-environment: How to separate dev/staging/prod D1 instances?

## Next Steps

→ **Phase 2:** Telegram webhook handler + Gemini intent detection
→ **Phase 3:** React frontend (in parallel with Phase 2)
