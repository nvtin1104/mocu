# MOCU MVP — Implementation Plan

**Date:** 2026-03-25 | **Duration:** 2-3 weeks | **Status:** Ready for Implementation

## Executive Summary

MOCU is a personal AI assistant combining:
- **Backend:** Cloudflare Workers + Hono + D1 (SQLite)
- **Bot:** Telegram webhook + Gemini intent detection
- **Frontend:** React + shadcn/ui (Phase 3)
- **Core Features:** Notes (CRUD), Todos (create/update/complete), Chat AI

**Phases:** 4 sequential/parallel phases for MVP implementation.

## Phase Overview

| Phase | Timeline | Focus | Status |
|-------|----------|-------|--------|
| [Phase 1: Backend Setup](#phase-1) | Days 1-5 | Hono + D1 + Auth | Planning |
| [Phase 2: Telegram Bot](#phase-2) | Days 4-9 | Webhook + Commands + Gemini | Planning |
| [Phase 3: Frontend](#phase-3) | Days 6-12 | React UI (Notes + Todos) | Planning |
| [Phase 4: Integration & Deploy](#phase-4) | Days 10-15 | Testing + Production Setup | Planning |

**Note:** Phase 2 & 3 can run in parallel once Phase 1 API is defined.

## Key Technologies

- **Cloudflare Workers:** Serverless compute (100K req/day free)
- **D1:** SQLite database (10M read/write daily)
- **Hono:** Lightweight REST framework (~13KB gzipped)
- **Telegram Bot API:** Webhook verification + message handling
- **Gemini 2.5+:** JSON Schema structured intent detection
- **React + shadcn/ui:** Frontend components

## Success Criteria

- [ ] Notes: Create, read, update, delete
- [ ] Todos: Create, view, mark done, delete
- [ ] Telegram: /note, /todo, /help, natural language commands
- [ ] Chat AI: Gemini intent detection → DB action
- [ ] Auth: JWT token + Telegram chat_id validation
- [ ] Security: HMAC verification, secrets management
- [ ] Deploy: Live Telegram bot + web dashboard

## Risk Summary

See individual phase files for detailed risk assessments. Key risks:
- Gemini quota limits (15 req/min free tier)
- D1 eventual consistency for audit logs
- Rate limiting strategy (per-user vs global)
- Message idempotency for retries

---

## Phase Files

- [Phase 1: Backend Setup](./phase-01-backend-setup.md)
- [Phase 2: Telegram Bot](./phase-02-telegram-bot.md)
- [Phase 3: Frontend](./phase-03-frontend.md)
- [Phase 4: Integration & Deploy](./phase-04-integration-deploy.md)

---

**Next Step:** Review Phase 1, confirm Cloudflare setup, start backend implementation.
