# MOCU MVP — Research & Planning Index

**Date:** 2026-03-25 | **Status:** Planning Complete | **Next:** Implementation

## Research Reports

1. **[Cloudflare Workers + Hono + D1 Stack](../reports/researcher-260325-hono-cf-workers-stack.md)**
   - Hono framework setup on CF Workers
   - D1 database schema & query patterns
   - JWT + Telegram auth implementation
   - Middleware stack (logger → CORS → rate-limit → auth)
   - Deployment via wrangler
   - Testing with Vitest
   - Unresolved: OTP flow, D1 backup strategy, session invalidation

2. **[Telegram Bot + Gemini Intent Detection](../reports/250325-telegram-gemini-integration.md)**
   - Telegram webhook security (HMAC-SHA256 verification)
   - Gemini API JSON Schema structured outputs
   - Vietnamese NLP optimization
   - Message processing pipeline
   - Rate limiting & quota management
   - Command patterns & intent routing
   - Audit logging & error recovery
   - Unresolved: Vietnamese dialectal variations, Durable Objects concurrency, KV consistency, message idempotency

## Implementation Plan

### Overview
[plan.md](./plan.md) — High-level roadmap (4 phases, 2-3 weeks)

### Phase Details
1. [Phase 1: Backend Setup](./phase-01-backend-setup.md) — Days 1-5
   - Hono + D1 + JWT auth
   - Notes & Todos CRUD endpoints
   - Zod validation

2. [Phase 2: Telegram Bot](./phase-02-telegram-bot.md) — Days 4-9 (parallel with Phase 3)
   - Webhook handler + HMAC verification
   - Commands: /note, /todo, /help, /todos
   - Gemini intent detection
   - Rate limiting & audit logging

3. [Phase 3: Frontend](./phase-03-frontend.md) — Days 6-12 (parallel with Phase 2)
   - React (Vite) + shadcn/ui + Tailwind
   - Notes page (CRUD)
   - Todos page (CRUD)
   - JWT token management

4. [Phase 4: Integration & Deploy](./phase-04-integration-deploy.md) — Days 10-15
   - E2E testing (Vitest)
   - Security audit
   - Production deployment
   - Monitoring & runbooks

## Key Technologies

- **Compute:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Cache:** Cloudflare KV
- **Framework:** Hono (backend), React (frontend)
- **UI:** shadcn/ui + Tailwind CSS
- **AI:** Google Gemini 2.5+
- **Bot:** Telegram Bot API

## Success Criteria

- [ ] MVP features complete (Notes, Todos, Telegram bot)
- [ ] All endpoints tested & working
- [ ] Telegram bot responds to commands & natural language
- [ ] Frontend deployed & accessible
- [ ] Security audit passed
- [ ] Production secrets configured
- [ ] Monitoring & logging active

## Unresolved Questions (Consolidated)

### Authentication & Security
1. OTP verification flow needed for Telegram?
2. JWT revocation list in KV vs stateless?
3. Session management: JWT-only or hybrid with KV?

### Data & Consistency
4. D1 backup strategy & recovery procedure?
5. KV eventual consistency acceptable for audit logs?
6. Message idempotency handling for retries?

### Scalability & Performance
7. Rate limiting: per-user vs per-chat-id vs global?
8. Durable Objects concurrency for distributed state?
9. Gemini quota failover: queue vs immediate response?

### AI & NLP
10. Vietnamese dialectal variations: how well supported?
11. Typo/abbreviation tolerance in intent detection?
12. Custom intent types: extensible schema?

---

**Ready to proceed with Phase 1 implementation.**

To start: Review [Phase 1](./phase-01-backend-setup.md), setup Cloudflare account, initialize Hono project.
