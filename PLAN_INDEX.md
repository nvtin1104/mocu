# MOCU — Project Planning & Implementation

**Project Name:** MOCU (Modern-aware Curious Unique Assistant)
**Status:** Planning Complete | **Start Date:** 2026-03-25
**Duration:** 2-3 weeks | **Stack:** Cloudflare Workers + React + Telegram

## Quick Links

- 📋 **[Full Design Spec](./design.md)** — Complete architecture & schema
- 🎯 **[Implementation Plan](./plans/20260325-1030-mocu-mvp/plan.md)** — 4-phase roadmap
- 🔍 **[Research Index](./plans/20260325-1030-mocu-mvp/RESEARCH_INDEX.md)** — 2 deep research reports
- 📝 **[Phase 1: Backend](./plans/20260325-1030-mocu-mvp/phase-01-backend-setup.md)** — Hono + D1 + Auth (Days 1-5)
- 🤖 **[Phase 2: Telegram](./plans/20260325-1030-mocu-mvp/phase-02-telegram-bot.md)** — Bot + Gemini (Days 4-9)
- 🎨 **[Phase 3: Frontend](./plans/20260325-1030-mocu-mvp/phase-03-frontend.md)** — React UI (Days 6-12)
- 🚀 **[Phase 4: Deploy](./plans/20260325-1030-mocu-mvp/phase-04-integration-deploy.md)** — Testing + Production (Days 10-15)

## MVP Scope

| Feature | Status | Details |
|---------|--------|---------|
| **Notes** | 📋 Planned | Create, read, update, delete |
| **Todos** | 📋 Planned | Create, view, mark done, delete |
| **Telegram Bot** | 📋 Planned | Commands + natural language |
| **Chat AI** | 📋 Planned | Gemini intent detection |
| **Backend API** | 📋 Planned | REST endpoints + D1 |
| **Frontend** | 📋 Planned | React + shadcn/ui |
| **Auth** | 📋 Planned | JWT + Telegram chat_id |

## Architecture Overview

```
┌─────────────────────────────┐
│  Telegram Bot (Webhook)     │
│  Commands + AI Intent       │
└────────────┬────────────────┘
             │
┌────────────▼────────────────┐
│  Cloudflare Worker (Hono)   │
│  REST API + Auth            │
└────────────┬────────────────┘
             │
    ┌────────┴─────────┐
    ▼                  ▼
┌────────────┐   ┌───────────┐
│ D1 (SQLite)│   │ KV (Cache)│
│ Database   │   │ Sessions  │
└────────────┘   └───────────┘

┌────────────────────────────┐
│  React Frontend (Vite)      │
│  Notes + Todos Pages        │
└────────────────────────────┘
```

## Implementation Timeline

```
Week 1:
  ├─ Phase 1: Backend (Days 1-5)
  │  └─ Hono app + D1 schema + CRUD endpoints
  │
  ├─ Phase 2: Telegram (Days 4-9) [parallel]
  │  └─ Webhook + commands + Gemini intent
  │
  └─ Phase 3: Frontend (Days 6-12) [parallel]
     └─ React UI + API integration

Week 2:
  └─ Phase 4: Deploy (Days 10-15)
     ├─ E2E testing
     ├─ Security audit
     ├─ Production deployment
     └─ Go-live
```

## Key Technologies

| Layer | Technology |
|-------|------------|
| Compute | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Backend | Hono (13KB framework) |
| Frontend | React 18 + Vite |
| UI | shadcn/ui + Tailwind CSS |
| AI | Google Gemini 2.5+ |
| Bot | Telegram Bot API |
| Auth | JWT + Telegram chat_id |

## Phase Breakdown

### ✅ Phase 1: Backend Foundation (Days 1-5)
- Hono app with middleware (logger, CORS, rate-limit, auth)
- D1 schema: users, notes, todos
- JWT authentication + Telegram login
- CRUD endpoints (Notes & Todos)
- Input validation with Zod
- **Deliverable:** Working REST API

### 🤖 Phase 2: Telegram Bot (Days 4-9, parallel)
- Webhook handler with HMAC-SHA256 verification
- Command routing (/note, /todo, /help, /todos)
- Gemini API integration (JSON Schema intent detection)
- Database action execution
- Rate limiting (20 msgs/hour per user)
- Audit logging to KV
- **Deliverable:** Functioning Telegram bot

### 🎨 Phase 3: React Frontend (Days 6-12, parallel)
- Vite + shadcn/ui + Tailwind setup
- Login page (Telegram chat_id)
- Notes page (CRUD with search)
- Todos page (CRUD with filters)
- JWT token management
- API client with error handling
- **Deliverable:** Live web dashboard

### 🚀 Phase 4: Integration & Production (Days 10-15)
- E2E test suite (Vitest)
- Security audit & fixes
- Production deployment (Cloudflare)
- Monitoring & logging
- Incident runbooks
- **Deliverable:** Live product (MVP)

## Success Metrics

- ✅ All CRUD endpoints working (100% uptime in testing)
- ✅ Telegram bot responds within 5 seconds
- ✅ Frontend loads in < 500ms (p95)
- ✅ Rate limiting prevents abuse
- ✅ No secrets in logs/errors
- ✅ Audit trail complete for compliance

## Research Findings

**2 Deep-Dive Reports:**
1. Cloudflare Workers + Hono + D1 (500 lines, ready-to-implement code)
2. Telegram Bot + Gemini API (300 lines, security-first patterns)

**Key Insights:**
- Hono is ideal for CF Workers (13KB, fastest routing)
- Gemini 2.5+ native JSON Schema = type-safe intent detection
- HMAC-SHA256 constant-time comparison critical
- Rate limiting via KV token bucket pattern
- Audit logging with 30-day KV retention
- No transaction support in D1 (MVP acceptable)

## Unresolved Questions

See [Research Index](./plans/20260325-1030-mocu-mvp/RESEARCH_INDEX.md#unresolved-questions-consolidated) for 12 key questions requiring product decisions.

## Next Steps

1. **Review** [Phase 1](./plans/20260325-1030-mocu-mvp/phase-01-backend-setup.md)
2. **Setup** Cloudflare account + wrangler CLI
3. **Initialize** Hono project
4. **Build** backend endpoints
5. **Test** locally before Phase 2 & 3

---

**Questions?** Check design.md for full spec or RESEARCH_INDEX.md for detailed findings.
