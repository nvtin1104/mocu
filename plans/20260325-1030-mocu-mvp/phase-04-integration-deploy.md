# Phase 4: Integration Testing & Deployment

**Duration:** Days 10-15 | **Dependencies:** Phase 1, 2, 3 | **Status:** Final Phase

## Overview

End-to-end testing of all components, security hardening, production deployment, and go-live with Telegram bot + web dashboard.

**Deliverables:**
- ✅ E2E test suite (critical paths)
- ✅ Security audit & fixes
- ✅ Production deployment checklist
- ✅ Monitoring & logging setup
- ✅ Documentation & runbooks

## Context & Key Insights

**From Research:**
- Rate limiting critical for production (Gemini 15 req/min)
- Message idempotency prevents duplicate processing
- Audit logging required for compliance
- HTTPS enforcement (Cloudflare handles automatically)
- KV eventual consistency acceptable for logs

## Requirements

### Testing Scope
- Login flow (Telegram chat ID → JWT token)
- Notes: create, read, update, delete
- Todos: create, read, update status, delete
- Telegram commands: /note, /todo, /help, /todos
- Natural language intent detection
- Rate limiting enforcement
- Error handling & recovery

### Security Checklist
- [ ] No secrets in code/config
- [ ] HMAC-SHA256 verification working
- [ ] JWT validation on all protected routes
- [ ] Rate limiting active
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] Audit logging enabled
- [ ] Error messages don't leak info

### Deployment Targets
- Backend: Cloudflare Workers
- Database: Cloudflare D1
- Frontend: Cloudflare Pages
- Cache: Cloudflare KV

## Architecture Validation

```
Production Flow:

User (Telegram)
    ↓
Bot Server (Cloudflare Worker)
    ├─→ Verify HMAC
    ├─→ Rate limit check
    ├─→ Gemini intent detection
    ├─→ DB action (D1)
    └─→ Send response
         ↓
D1 Database (SQLite)
    ├─→ Create/Read/Update/Delete
    ├─→ Audit trail (KV)
    └─→ Return result

Web User (React)
    ↓
Frontend (Cloudflare Pages)
    ├─→ Login with chat ID
    ├─→ Fetch notes/todos (with JWT)
    ├─→ Create/update/delete
    └─→ Display in UI
         ↓
Backend API (CF Worker)
    ├─→ Validate JWT
    ├─→ Query D1
    └─→ Return JSON
```

## Implementation Steps

### Step 1: Create Test Suite (Day 10)

File: `backend/__tests__/integration.test.ts`
```typescript
import { describe, it, expect, beforeAll } from 'vitest'

const API_URL = 'http://localhost:8787'
let token: string
let userId: string
let noteId: string
let todoId: string

describe('MOCU Integration Tests', () => {
  describe('Authentication', () => {
    it('should login with Telegram chat ID', async () => {
      const res = await fetch(`${API_URL}/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: '123456789' })
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.token).toBeDefined()
      expect(data.user_id).toBeDefined()

      token = data.token
      userId = data.user_id
    })

    it('should reject missing chat ID', async () => {
      const res = await fetch(`${API_URL}/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      expect(res.status).toBe(400)
    })
  })

  describe('Notes CRUD', () => {
    it('should create note', async () => {
      const res = await fetch(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'Test Note', content: 'This is a test' })
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.id).toBeDefined()
      noteId = data.id
    })

    it('should list notes', async () => {
      const res = await fetch(`${API_URL}/api/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      expect(res.status).toBe(200)
      const notes = await res.json()
      expect(Array.isArray(notes)).toBe(true)
    })

    it('should get single note', async () => {
      const res = await fetch(`${API_URL}/api/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      expect(res.status).toBe(200)
      const note = await res.json()
      expect(note.id).toBe(noteId)
    })

    it('should update note', async () => {
      const res = await fetch(`${API_URL}/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'Updated Note' })
      })

      expect(res.status).toBe(200)
    })

    it('should delete note', async () => {
      const res = await fetch(`${API_URL}/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      expect(res.status).toBe(200)
    })

    it('should reject unauthorized access', async () => {
      const res = await fetch(`${API_URL}/api/notes`)
      expect(res.status).toBe(401)
    })
  })

  describe('Todos CRUD', () => {
    it('should create todo', async () => {
      const res = await fetch(`${API_URL}/api/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'Buy milk', priority: 'high' })
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.id).toBeDefined()
      todoId = data.id
    })

    it('should list pending todos', async () => {
      const res = await fetch(`${API_URL}/api/todos?status=pending`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      expect(res.status).toBe(200)
      const todos = await res.json()
      expect(Array.isArray(todos)).toBe(true)
    })

    it('should update todo status', async () => {
      const res = await fetch(`${API_URL}/api/todos/${todoId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'done' })
      })

      expect(res.status).toBe(200)
    })

    it('should delete todo', async () => {
      const res = await fetch(`${API_URL}/api/todos/${todoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      expect(res.status).toBe(200)
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limit', async () => {
      // Send 21 requests (limit is 20/hour)
      for (let i = 0; i < 21; i++) {
        await fetch(`${API_URL}/api/notes`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }

      // 21st should fail
      const res = await fetch(`${API_URL}/api/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      expect(res.status).toBe(429)
    })
  })
})
```

### Step 2: Security Audit (Day 11)

Checklist:
```markdown
## Security Audit Checklist

### Secrets Management
- [ ] No secrets in wrangler.toml
- [ ] All secrets set via `wrangler secret put`
- [ ] .env.local in .gitignore
- [ ] CI/CD uses secret references

### Authentication
- [ ] JWT validation on all /api/* routes
- [ ] Token expiration set (24h)
- [ ] Invalid tokens return 401
- [ ] HMAC-SHA256 verification using constant-time compare

### Input Validation
- [ ] All POST/PUT data validated with Zod
- [ ] Query parameters validated
- [ ] SQL injection prevented (prepared statements)
- [ ] XSS prevention (JSON response only)

### API Security
- [ ] CORS restricted to known origins
- [ ] Rate limiting active (20 req/hour per user)
- [ ] Error messages don't expose internals
- [ ] Request logging for audit trail

### Data Privacy
- [ ] User data isolated (no cross-user queries)
- [ ] Passwords not stored (N/A for MVP)
- [ ] Audit logs with 30-day retention
- [ ] D1 encryption at rest (Cloudflare handles)

### Frontend Security
- [ ] HTTPS enforced (Pages automatically)
- [ ] No API keys in client code
- [ ] JWT not exposed in HTML
- [ ] Content Security Policy headers (consider)

### Deployment
- [ ] Production secrets configured
- [ ] Database backups enabled
- [ ] Monitoring/alerting setup
- [ ] Rollback plan documented
```

### Step 3: Production Deployment (Day 12-13)

```bash
# Backend deployment
cd backend

# Deploy to production
wrangler deploy --env production

# Verify worker is running
curl https://mocu-api.YOUR-SUBDOMAIN.workers.dev/health

# Frontend deployment
cd ../frontend

# Build optimized
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=mocu-frontend

# Test production URLs
curl https://mocu.YOUR-DOMAIN.com/
```

### Step 4: Monitoring & Logging (Day 13-14)

File: `backend/src/middleware/monitoring.ts`
```typescript
import { Context } from 'hono'

export async function monitoringMiddleware(c: Context, next) {
  const start = performance.now()
  const req = c.req

  await next()

  const duration = performance.now() - start
  const log = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    status: c.res.status,
    duration_ms: duration,
    user_id: c.get('user_id') || 'unknown'
  }

  // Log to KV for analysis
  await c.env.KV.put(
    `log:${Date.now()}:${Math.random()}`,
    JSON.stringify(log),
    { expirationTtl: 604800 } // 7 days
  )

  // Alert on errors
  if (c.res.status >= 500) {
    console.error('Server error:', log)
  }
}
```

### Step 5: Documentation & Runbooks (Day 14)

Create `docs/RUNBOOKS.md`:
```markdown
# MOCU Operations Runbooks

## Deployment
1. Update backend: `wrangler deploy --env production`
2. Update frontend: `wrangler pages deploy dist`
3. Verify: Check telegram bot and web dashboard

## Rollback
1. Revert code: `git revert <commit>`
2. Redeploy: `wrangler deploy --env production`
3. Verify: Test critical paths

## Scaling
- Cloudflare free tier: 100K requests/day
- Pro tier: Unlimited
- Monitor KV usage (1GB free)
- D1 free: 10M reads/writes/day

## Debugging
- View logs: `wrangler tail --env production`
- Check KV: List recent logs in dashboard
- Test webhook: `curl -X POST ... with test data`

## Incidents
- Gemini quota exceeded: Queue messages, notify user
- DB unavailable: Return 503, queue in KV
- High latency: Check Cloudflare analytics
```

### Step 6: Go-Live Checklist (Day 15)

```markdown
## Pre-Launch Checklist

### Backend
- [ ] All secrets configured in Cloudflare dashboard
- [ ] Database migrations applied
- [ ] Rate limiting tested
- [ ] HMAC verification working
- [ ] Audit logging active
- [ ] Error handling tested
- [ ] Load tested (at least 1000 req/min)

### Frontend
- [ ] Login flow tested end-to-end
- [ ] Notes CRUD tested
- [ ] Todos CRUD tested
- [ ] Mobile responsiveness verified
- [ ] Dark theme applied
- [ ] No console errors

### Telegram Bot
- [ ] Bot token set in secrets
- [ ] Webhook URL registered
- [ ] Commands tested: /note, /todo, /help, /todos
- [ ] Natural language intent detection working
- [ ] Rate limiting verified
- [ ] Error messages friendly

### Monitoring
- [ ] Logs stored in KV
- [ ] Error alerts configured
- [ ] Dashboard created (optional)
- [ ] Runbooks documented

### Documentation
- [ ] README with setup instructions
- [ ] API documentation
- [ ] Telegram bot commands documented
- [ ] Deployment guide
- [ ] Incident response guide
```

## Todo List

- [ ] Write integration test suite
- [ ] Run security audit
- [ ] Fix security issues
- [ ] Load test backend
- [ ] Test frontend responsiveness
- [ ] Configure production secrets
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Register Telegram webhook
- [ ] Test Telegram bot end-to-end
- [ ] Setup monitoring/logging
- [ ] Document runbooks
- [ ] Create incident response guide
- [ ] Verify all critical paths work
- [ ] Go-live announcement

## Success Criteria

- [ ] All API endpoints return correct status codes
- [ ] Authentication works (JWT validation)
- [ ] CRUD operations persist to D1
- [ ] Telegram bot responds to all commands
- [ ] Rate limiting blocks excessive requests
- [ ] Errors display user-friendly messages
- [ ] Production URLs accessible
- [ ] No secrets in logs/errors
- [ ] 99% uptime target achievable
- [ ] Response times < 500ms (p95)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Data loss | Critical | D1 backups enabled |
| Rate limit hits | High | Queue + fallback |
| HMAC verification fails | High | Constant-time comparison |
| Gemini quota exceeded | Medium | Fallback keyword matching |
| Frontend 404s | Low | Cloudflare redirect rules |
| Secrets exposed | Critical | Audit logs, no logging secrets |

## Security Considerations

- ✅ Production secrets via Cloudflare dashboard only
- ✅ HMAC-SHA256 constant-time verification
- ✅ Rate limiting prevents abuse
- ✅ Audit logging for compliance
- ✅ Input validation on all endpoints
- ✅ Error messages sanitized
- ⚠️ localStorage JWT (upgrade to HttpOnly in future)
- ⚠️ No DDoS protection (optional Cloudflare feature)

## Post-Launch

### Monitoring
- Check logs daily for first week
- Monitor error rates
- Track Gemini quota usage
- Monitor D1 query counts

### Improvements (Phase 5)
- Add caching layer (reduce DB queries)
- Implement HttpOnly JWT cookies
- Add DDoS protection
- Create admin dashboard
- Add analytics/insights

## Next Steps

→ **Phase 5+:** Additional features (projects, alarms, schedules, voice)
→ **Maintenance:** Monitor production, fix bugs, optimize performance
