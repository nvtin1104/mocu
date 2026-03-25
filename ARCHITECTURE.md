# ARCHITECTURE - Kiến Trúc Hệ Thống

Chi tiết về thiết kế, luồng dữ liệu, và thành phần của MOCU.

---

## 🏗️ Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Telegram Users                                  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ Telegram Bot API
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                    Telegram Bot (@mocu_assistant_bot)                    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Webhook Receiver                                               │   │
│  │  ├─ Verify HMAC-SHA256 signature                               │   │
│  │  ├─ Parse Telegram Update                                      │   │
│  │  └─ Rate limit check (20/hour per user)                        │   │
│  └─────────────┬───────────────────────────────────────────────────┘   │
│                │                                                         │
│  ┌─────────────▼───────────────────────────────────────────────────┐   │
│  │  Intent Detection                                               │   │
│  │  ├─ Google Gemini 2.0-flash AI (primary)                       │   │
│  │  └─ Fallback: Keyword matching                                 │   │
│  └─────────────┬───────────────────────────────────────────────────┘   │
│                │                                                         │
│  ┌─────────────▼───────────────────────────────────────────────────┐   │
│  │  Action Handler                                                 │   │
│  │  ├─ CREATE_NOTE → /api/notes POST                              │   │
│  │  ├─ CREATE_TODO → /api/todos POST                              │   │
│  │  ├─ QUERY_TODOS → /api/todos GET + format                      │   │
│  │  ├─ QUERY_NOTES → /api/notes GET + format                      │   │
│  │  └─ HELP → Send instructions                                   │   │
│  └─────────────┬───────────────────────────────────────────────────┘   │
│                │                                                         │
│                │ Send response back to Telegram                         │
└────────────────┼─────────────────────────────────────────────────────┘
                 │ POST /api/telegram/webhook
                 │
┌────────────────▼─────────────────────────────────────────────────────────┐
│                 Cloudflare Workers (Hono Backend)                         │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Middleware Stack                                                │  │
│  │  ├─ Logger (all requests)                                        │  │
│  │  ├─ CORS (whitelist specific origins)                           │  │
│  │  └─ JWT Auth (protected routes)                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Public Routes                                                   │  │
│  │  ├─ GET /health (health check)                                 │  │
│  │  └─ POST /auth/telegram (login with chat_id)                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Protected Routes (JWT required)                                │  │
│  │  ├─ GET/POST /api/notes (list/create)                          │  │
│  │  ├─ GET/PUT/DELETE /api/notes/:id (read/update/delete)        │  │
│  │  ├─ GET/POST /api/todos (list/create)                          │  │
│  │  ├─ PUT/DELETE /api/todos/:id (update/delete)                  │  │
│  │  └─ POST /api/telegram/webhook (bot events)                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Database Queries                                                │  │
│  │  ├─ User authentication & creation                              │  │
│  │  ├─ User data isolation (WHERE user_id = ?)                    │  │
│  │  ├─ CRUD operations on notes & todos                            │  │
│  │  └─ Query filtering by status/tags                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────┬─────────────────────────────────────────────────────────┘
                 │
┌────────────────┼─────────────────────────────────────────────────────────┐
│  Data Layer    │                                                          │
│  ┌─────────────▼──────────────┐       ┌──────────────────────────────┐ │
│  │   Cloudflare D1 (SQLite)   │       │  Cloudflare KV Store        │ │
│  │                            │       │                              │ │
│  │  Tables:                   │       │  Keys:                       │ │
│  │  ├─ users                  │       │  ├─ ratelimit:tg:*          │ │
│  │  │  ├─ id (PK)             │       │  ├─ ratelimit:auth:*        │ │
│  │  │  ├─ telegram_chat_id    │       │  └─ msg:tg:*                │ │
│  │  │  └─ created_at          │       │                              │ │
│  │  │                         │       │  Purpose:                    │ │
│  │  ├─ notes                  │       │  ├─ Rate limiting           │ │
│  │  │  ├─ id (PK)             │       │  └─ Audit logs              │ │
│  │  │  ├─ user_id (FK)        │       │                              │ │
│  │  │  ├─ title               │       │  TTL: Auto-expire           │ │
│  │  │  ├─ content             │       │  (1 hour for rate limit,    │ │
│  │  │  ├─ tags                │       │   30 days for logs)         │ │
│  │  │  ├─ is_archived         │       │                              │ │
│  │  │  └─ timestamps          │       │                              │ │
│  │  │                         │       │                              │ │
│  │  ├─ todos                  │       │                              │ │
│  │  │  ├─ id (PK)             │       │                              │ │
│  │  │  ├─ user_id (FK)        │       │                              │ │
│  │  │  ├─ title               │       │                              │ │
│  │  │  ├─ status              │       │                              │ │
│  │  │  └─ timestamps          │       │                              │ │
│  │  │                         │       │                              │ │
│  │  Indexes:                  │       │                              │ │
│  │  ├─ user_id (fast filter)  │       │                              │ │
│  │  └─ created_at (sorting)   │       │                              │ │
│  └─────────────────────────────┘       └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
                 │
┌────────────────┬─────────────────────────────────────────────────────────┐
│  Frontend      │                                                          │
│  ┌─────────────▼──────────────────────────────────────────────────────┐ │
│  │           React + Vite + React Router (SPA)                        │ │
│  │                                                                     │ │
│  │  ┌───────────────────────────────────────────────────────────┐   │ │
│  │  │  URL Router                                               │   │ │
│  │  │  ├─ / → LoginPage (redirect to /notes if authenticated)   │   │ │
│  │  │  ├─ /notes → NotesPage (protected)                        │   │ │
│  │  │  └─ /todos → TodosPage (protected)                        │   │ │
│  │  └───────────────────────────────────────────────────────────┘   │ │
│  │                                                                     │ │
│  │  ┌───────────────────────────────────────────────────────────┐   │ │
│  │  │  State Management (Custom Hooks)                          │   │ │
│  │  │  ├─ useAuth()                                             │   │ │
│  │  │  │  ├─ token (localStorage)                              │   │ │
│  │  │  │  ├─ userId                                            │   │ │
│  │  │  │  └─ login(chatId) / logout()                          │   │ │
│  │  │  │                                                        │   │ │
│  │  │  ├─ useNotes(token)                                      │   │ │
│  │  │  │  ├─ notes (array)                                     │   │ │
│  │  │  │  ├─ loading                                           │   │ │
│  │  │  │  └─ CRUD operations                                   │   │ │
│  │  │  │                                                        │   │ │
│  │  │  └─ useTodos(token)                                      │   │ │
│  │  │     ├─ todos (array)                                     │   │ │
│  │  │     ├─ loading                                           │   │ │
│  │  │     └─ CRUD operations                                   │   │ │
│  │  └───────────────────────────────────────────────────────────┘   │ │
│  │                                                                     │ │
│  │  ┌───────────────────────────────────────────────────────────┐   │ │
│  │  │  Components                                               │   │ │
│  │  │  ├─ LoginPage (form → POST /auth/telegram)               │   │ │
│  │  │  ├─ NotesPage (CRUD UI + list)                           │   │ │
│  │  │  ├─ TodosPage (CRUD UI + filtering)                      │   │ │
│  │  │  ├─ ErrorBoundary (error catching)                       │   │ │
│  │  │  └─ Protected routes (auth guard)                        │   │ │
│  │  └───────────────────────────────────────────────────────────┘   │ │
│  │                                                                     │ │
│  │  ┌───────────────────────────────────────────────────────────┐   │ │
│  │  │  API Client (createApiClient factory)                     │   │ │
│  │  │  ├─ get<T>(path): Promise<T>                             │   │ │
│  │  │  ├─ post<T>(path, data): Promise<T>                      │   │ │
│  │  │  ├─ put<T>(path, data): Promise<T>                       │   │ │
│  │  │  └─ delete<T>(path): Promise<T>                          │   │ │
│  │  │                                                            │   │ │
│  │  │  Auto-injects Authorization header when token exists      │   │ │
│  │  └───────────────────────────────────────────────────────────┘   │ │
│  │                                                                     │ │
│  │  Styling: Tailwind CSS v4 + HSL Variables                         │ │
│  │  ├─ Light mode (default)                                         │ │
│  │  └─ Dark mode (prefers-color-scheme)                             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### Login Flow

```
User → LoginPage (Telegram Chat ID)
  ↓
POST /auth/telegram {chat_id}
  ↓
Backend:
  1. Rate limit check (KV)
  2. Check user exists in D1
  3. If not exist: Create new user
  4. Generate JWT token (HS256)
  5. Return {token, user_id}
  ↓
Frontend:
  1. Store token in localStorage
  2. Redirect to /notes
  ↓
Protected Routes:
  1. Check token exists
  2. Set Authorization header
  3. All API calls now authenticated
```

### Create Note Flow

```
User → NotesPage (form: title + content)
  ↓
Click "Add Note"
  ↓
Frontend:
  1. Call useNotes.createNote(title, content)
  2. POST /api/notes with JWT header
  ↓
Backend:
  1. JWT middleware verifies token
  2. Extract user_id from JWT
  3. Insert note in D1 with user_id
  4. Return created note
  ↓
Frontend:
  1. useNotes hook updates local state
  2. Note appears in list immediately
  3. Clear form
```

### Telegram Bot Message Flow

```
User → Message @mocu_assistant_bot on Telegram
  ↓
Telegram Server:
  1. Format update as JSON
  2. Sign with HMAC-SHA256
  3. POST to webhook URL
  ↓
Backend /api/telegram/webhook:
  1. Verify HMAC signature (constant-time)
  2. Rate limit check (KV)
  3. Parse message text
  ↓
Intent Detection:
  Option A: Google Gemini AI
    1. Send text to Gemini API
    2. Ask for JSON response
    3. Extract intent + parameters

  Option B: Fallback keyword matching
    1. Check keywords (create, list, help)
    2. Extract entity names
    3. Default to HELP if unrecognized
  ↓
Action Handler:
  1. Query/Create notes/todos based on intent
  2. Format response message
  3. Send to Telegram API
  ↓
Telegram → User receives response message
```

---

## 🔐 Security Architecture

### Authentication Flow

```
User Credentials: Telegram Chat ID (public, no secret)
        ↓
Backend validates:
  ├─ Not rate limited (KV check)
  ├─ Chat ID is valid number
  └─ Create user if first time
        ↓
Generate JWT:
  {
    "sub": "user-id",           // User's database UUID
    "chat_id": "123456789",     // Original Telegram ID
    "exp": <24h-from-now>       // Expires in 24 hours
  }
  Signed with: HMAC-SHA256 + JWT_SECRET
        ↓
Return to Frontend:
  {
    "token": "<jwt-string>",
    "user_id": "<uuid>"
  }
        ↓
Frontend stores in localStorage
        ↓
Every request:
  Authorization: Bearer <jwt-string>
        ↓
Backend verifies:
  ├─ Signature valid (HMAC-SHA256)
  ├─ Token not expired
  └─ Extract user_id from claims
```

### Data Isolation

```
User A                          User B
    ↓                              ↓
JWT token (user_id=A)         JWT token (user_id=B)
    ↓                              ↓
SELECT * FROM notes            SELECT * FROM notes
WHERE user_id = 'A'            WHERE user_id = 'B'
    ↓                              ↓
  [Note 1, Note 2]              [Note 3, Note 4]

Impossible for User A to see User B's data
```

### Telegram Webhook Security

```
Telegram → POST /api/telegram/webhook
  Header: X-Telegram-Bot-Api-Secret-Token: <HMAC>
  Body: {update JSON}

Backend verification:
  1. Extract secret token from header
  2. Compute: HMAC-SHA256(body, TELEGRAM_SECRET)
  3. Constant-time comparison:
     secretHash === computedHash ?
  4. If mismatch → Reject (403)
  5. If match → Process update

Prevents spoofing/unauthorized webhook calls
```

---

## 💾 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                      -- UUID
  telegram_chat_id TEXT UNIQUE NOT NULL,    -- From Telegram
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INDEX ON telegram_chat_id  -- Fast lookup by chat ID
```

**Data Flow:**
1. User sends `/start` to bot
2. Backend creates user with unique telegram_chat_id
3. Returns user.id for JWT

---

### Notes Table
```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,                      -- UUID
  user_id TEXT NOT NULL,                    -- Foreign key
  title TEXT NOT NULL,                      -- User input
  content TEXT NOT NULL,                    -- User input
  tags TEXT,                                -- Comma-separated
  is_archived INTEGER DEFAULT 0,            -- 0 or 1
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX ON (user_id, created_at DESC)       -- Fast user queries
);
```

**Key Points:**
- Cascade delete: if user deleted, all notes deleted
- User isolation: queries always filter by user_id
- Timestamps: automatic creation/update

---

### Todos Table
```sql
CREATE TABLE todos (
  id TEXT PRIMARY KEY,                      -- UUID
  user_id TEXT NOT NULL,                    -- Foreign key
  title TEXT NOT NULL,                      -- User input
  status TEXT DEFAULT 'pending',            -- pending or completed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK(status IN ('pending', 'completed')),-- Constraint
  INDEX ON (user_id, status)                -- Fast filtering
);
```

---

## 🎛️ External API Integration

### Google Gemini 2.0-flash

```
Intent Detection Request:
{
  "prompt": "create a note about my meeting",
  "responseSchema": {
    "intent": "CREATE_NOTE|CREATE_TODO|QUERY_NOTES|etc",
    "parameters": {
      "title": "optional title",
      "content": "optional content"
    }
  }
}
        ↓
Gemini AI processes natural language
        ↓
Response:
{
  "intent": "CREATE_NOTE",
  "parameters": {
    "title": "my meeting",
    "content": "about my meeting"
  }
}

Fallback: If API fails or timeout, use keyword matching
```

### Telegram Bot API

```
Send Message:
POST https://api.telegram.org/bot<TOKEN>/sendMessage
{
  "chat_id": "123456789",
  "text": "Response message"
}

Get Updates (Polling):
GET https://api.telegram.org/bot<TOKEN>/getUpdates

Set Webhook (Production):
POST https://api.telegram.org/bot<TOKEN>/setWebhook
{
  "url": "https://mocu-api.*.workers.dev/api/telegram/webhook",
  "secret_token": "<TELEGRAM_SECRET>"
}
```

---

## 📊 Performance Considerations

### Caching Strategy

**Frontend:**
- useAuth: localStorage caching (survives refresh)
- useNotes/useTodos: In-memory state
- No HTTP caching (data changes frequently)

**Backend:**
- D1 Database: Cloudflare managed caching
- KV Store: Rate limit data (1-hour TTL)
- No explicit application-level caching

### Optimization Points

1. **Database Indexes:**
   - user_id indexed on notes/todos (filter queries)
   - created_at indexed (sorting)
   - Composite index on (user_id, status) for todos filtering

2. **Query Optimization:**
   - Always filter by user_id (prevents full scans)
   - Limit results if needed (pagination not implemented)
   - Use COUNT() sparingly

3. **Frontend:**
   - React lazy loading (code splitting)
   - Tailwind CSS purged in production
   - Vite tree-shaking unused code

4. **API:**
   - Cloudflare Workers runs globally (low latency)
   - D1 co-located with Workers
   - No N+1 queries (each hook makes minimal requests)

---

## 🔄 Deployment Architecture

### Development (Local)
```
Frontend (Vite 5173) ←→ Backend (Wrangler 8788)
                            ↓
                      Local D1 Database (.wrangler/)
```

### Production (Cloudflare)
```
Users → Cloudflare Pages (mocu-frontend.pages.dev)
         └─ Frontend React App
              ↓
              API calls (CORS enabled)
              ↓
        Cloudflare Workers (mocu-api.workers.dev)
         ├─ Hono server
         ├─ Rate limiting (KV)
         └─ Database queries
              ↓
        Cloudflare D1 (Production Database)
         └─ SQLite on Durable Object

        Telegram Bot API
         └─ Webhook → Workers
```

### Region Distribution
- **Frontend:** Global CDN (Pages automatic)
- **Backend:** Global Workers Edge (auto-replicated)
- **Database:** Single D1 instance (check your account region)

---

## 🚀 Scaling Considerations

### Current Limits
- SQLite max: ~1GB (D1 limit)
- Workers: 10MB code limit
- KV: 10GB free tier
- API calls: 100k/day free (Workers)

### If You Need to Scale
1. **Database:** Migrate to PostgreSQL (via Neon/Supabase)
2. **Cache:** Add Redis for session caching
3. **Workers:** Monitor CPU/memory usage on dashboard
4. **KV:** Monitor rate limiting data growth
5. **Static Assets:** Move to R2 if >1GB

---

## 📝 Design Decisions

### Why SQLite (D1)?
- ✅ Simple ACID transactions
- ✅ No schema migrations needed (single file)
- ✅ Cloudflare integration
- ❌ Limited to single region
- ❌ Can't scale horizontally

### Why JWT instead of Sessions?
- ✅ Stateless (no server-side session DB)
- ✅ Works well with serverless
- ✅ Client carries auth info
- ❌ Can't invalidate immediately (fixed with short 24h expiry)

### Why localStorage instead of httpOnly Cookies?
- ✅ Simpler frontend code
- ✅ Works with React hooks
- ❌ XSS vulnerable (consider upgrade to cookies)

### Why Gemini instead of fine-tuned model?
- ✅ No training needed
- ✅ Handles natural language well
- ✅ JSON Schema structured output
- ❌ API costs if scaling (minimal for MVP)

---

## 🔧 Extensibility Points

### Add a New Feature (e.g., Tags)

1. **Database:** Add column to notes table
2. **Backend:** Update schema + types
3. **API:** Accept tags parameter
4. **Frontend:** Add tags input to form
5. **Hooks:** Update API call to include tags

Example: Tags in notes
```
Frontend UI → useNotes.createNote(..., tags)
             → POST /api/notes {tags: "..."}
             → Backend inserts into D1
             → SELECT returns with tags
             → useNotes state updates
             → UI shows tags
```

### Add a New Entity (e.g., Categories)

1. Create categories table in D1
2. Add routes in backend (CRUD)
3. Add hooks in frontend (useCategories)
4. Add UI pages (CategoriesPage)
5. Add routes in App.tsx

---

## 🎓 Architecture Patterns Used

| Pattern | Usage | Benefit |
|---------|-------|---------|
| **Factory** | createApiClient() | Easy to configure API client |
| **Custom Hooks** | useAuth, useNotes, useTodos | State management in React |
| **Middleware** | JWT auth, CORS, logging | Clean separation of concerns |
| **Error Boundaries** | React component wrapper | Graceful error handling |
| **Protected Routes** | ProtectedRoute component | Authorization in UI |
| **Webhook** | Telegram updates | Event-driven architecture |
| **KV for Cache** | Rate limiting | Distributed state |

---

## 📚 Related Documentation

- [SETUP.md](./SETUP.md) - How to run locally
- [DEPLOYMENT.md](./DEPLOYMENT.md) - How to deploy
- [API.md](./API.md) - API endpoint reference
- [REQUIREMENTS.md](./REQUIREMENTS.md) - Tech requirements

---

**Document Version:** 1.0.0
**Architecture Version:** 1.0
**Last Updated:** March 2026
**Status:** Complete & Validated
