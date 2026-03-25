# MOCU - Modern-aware Curious Unique Assistant

**MOCU** là một trợ lý AI cá nhân được xây dựng với công nghệ hiện đại, kết hợp Cloudflare Workers (backend), Telegram Bot, và React Frontend. Hệ thống cho phép người dùng quản lý ghi chú (Notes) và công việc (Todos) thông qua giao diện web hoặc bot Telegram.

## 🎯 Tính Năng Chính

### 1. Xác Thực & Bảo Mật
- Đăng nhập qua Telegram Chat ID
- JWT token authentication (24h validity)
- HMAC-SHA256 webhook verification
- Rate limiting (20 messages/hour từ Telegram, 10 login attempts/hour)

### 2. Quản Lý Ghi Chú (Notes)
- Tạo, xem, sửa, xóa ghi chú
- Tags và archiving support
- User data isolation (mỗi user chỉ thấy dữ liệu riêng)

### 3. Quản Lý Công Việc (Todos)
- Tạo, đánh dấu hoàn thành, xóa công việc
- Lọc theo trạng thái (pending/completed)
- Deadline tracking

### 4. Telegram Bot Integration
- Intent detection với Google Gemini 2.0-flash AI
- Fallback keyword matching nếu Gemini không available
- Tự động tạo/cập nhật notes và todos từ Telegram

### 5. UI/UX
- Responsive design (mobile, tablet, desktop)
- Dark mode support (CSS variables)
- Protected routes (require authentication)
- Error boundaries (graceful error handling)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Telegram Bot token (from @BotFather)
- Google Gemini API key (from Google Cloud)
- Cloudflare account (for deployment)

### Local Development Setup

```bash
# Backend
cd backend
npm install
npm run dev                    # Starts on http://localhost:8788

# Frontend (new terminal)
cd frontend
npm install
npm run dev                    # Starts on http://localhost:4000

# The app should now be accessible at http://localhost:4000
```

See [SETUP.md](./SETUP.md) for detailed setup instructions.

---

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** — Complete setup & development guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Production deployment to Cloudflare
- **[REQUIREMENTS.md](./REQUIREMENTS.md)** — Technical requirements & credentials
- **[API.md](./API.md)** — REST API endpoints & examples
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — System design & data flow

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────┐
│   Telegram Bot (Telegram API)       │
└──────────────┬──────────────────────┘
               │ Webhook
┌──────────────▼──────────────────────┐
│   Cloudflare Workers (Hono)         │
│   ├─ /auth/telegram (Login)         │
│   ├─ /api/telegram/webhook (Bot)    │
│   ├─ /api/notes (CRUD)              │
│   ├─ /api/todos (CRUD)              │
│   └─ Gemini Intent Detection        │
└──────────────┬──────────────────────┘
               │ D1 Database
┌──────────────▼──────────────────────┐
│   Cloudflare D1 (SQLite)            │
│   ├─ users table                    │
│   ├─ notes table                    │
│   └─ todos table                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   React Frontend (Vite)             │
│   ├─ Login Page                     │
│   ├─ Notes Page                     │
│   ├─ Todos Page                     │
│   └─ Error Boundary                 │
└──────────────┬──────────────────────┘
               │ JWT Auth
               ▼
    (Connects to Workers API)
```

---

## 📦 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Hono + Cloudflare Workers | REST API, JWT auth |
| **Database** | Cloudflare D1 (SQLite) | User, notes, todos data |
| **Cache/KV** | Cloudflare KV | Rate limiting, audit logs |
| **NLP** | Google Gemini 2.0-flash | Intent detection |
| **Frontend** | React 18 + Vite + TypeScript | User interface |
| **Styling** | Tailwind CSS v4 | Responsive UI |
| **Routing** | React Router v6 | Client-side navigation |
| **Auth** | JWT (HS256) + localStorage | Session management |
| **Bot** | Telegram Bot API | User messaging |

---

## 🔐 Security Features

✅ **Authentication:** JWT with 24h expiration
✅ **Rate Limiting:** 20 messages/hour (Telegram), 10 login attempts/hour
✅ **CORS:** Whitelist specific domains (prevents CSRF)
✅ **Webhook Verification:** HMAC-SHA256 signature validation (Telegram)
✅ **Error Sanitization:** No internal details exposed in production
✅ **User Isolation:** Each user can only access own notes/todos
✅ **Error Boundaries:** Frontend error handling prevents blank screens
⚠️ **Token Storage:** Currently in localStorage (consider httpOnly cookies for production)

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Build Verification
```bash
# Backend
cd backend && npm run type-check && npm run build

# Frontend
cd frontend && npm run build
```

---

## 🌐 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete step-by-step instructions.

**Quick checklist:**
- [ ] Cloudflare account setup
- [ ] Create D1 database
- [ ] Create KV namespaces
- [ ] Set environment secrets
- [ ] Deploy backend to Workers
- [ ] Register Telegram webhook
- [ ] Deploy frontend to Pages

---

## 🔗 API Endpoints

### Public
- `GET /health` — Health check
- `POST /auth/telegram` — Login with chat_id

### Protected (require JWT)
- `GET /api/notes` — List user's notes
- `POST /api/notes` — Create note
- `GET /api/notes/:id` — Read note
- `PUT /api/notes/:id` — Update note
- `DELETE /api/notes/:id` — Delete note
- `GET /api/todos` — List user's todos
- `POST /api/todos` — Create todo
- `PUT /api/todos/:id` — Update todo
- `DELETE /api/todos/:id` — Delete todo

See [API.md](./API.md) for detailed documentation.

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests & type-check
4. Commit with conventional commit message
5. Push & create PR

---

**Version:** 1.0.0 | **Status:** MVP | **Last Updated:** March 2026
