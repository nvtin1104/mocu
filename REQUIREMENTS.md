# REQUIREMENTS - Yêu Cầu Kỹ Thuật & Thành Phần

Danh sách đầy đủ các yêu cầu kỹ thuật, dependencies, credentials, và tài nguyên cần thiết cho MOCU.

---

## 🖥️ System Requirements

### Minimum (Local Development)
| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18.0.0+ | LTS recommended |
| npm | 9.0.0+ | Comes with Node.js |
| Git | 2.30.0+ | For version control |
| Disk Space | 2GB+ | node_modules + databases |
| RAM | 2GB+ | Comfortable development |

### Recommended (Development)
| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20.x (LTS) | Latest stable |
| npm | 10.x+ | Better performance |
| Git | 2.40.0+ | Latest features |
| Disk Space | 5GB+ | Faster rebuilds |
| RAM | 4GB+ | Smooth development |

### Operating Systems
- ✅ Windows 10/11 (with WSL2 or PowerShell)
- ✅ macOS 12+
- ✅ Linux (Ubuntu 20.04+, Debian 11+, Fedora 36+)

---

## 📦 Dependencies

### Backend (backend/package.json)

**Core Framework:**
- `hono@3.x` - Web framework
- `@hono/zod-validator@0.x` - Input validation
- `zod@3.x` - Schema validation

**Authentication & Security:**
- `hono/jwt` - JWT token handling
- `crypto` (Node.js built-in) - HMAC signing

**Database:**
- `@cloudflare/workers-types` - Cloudflare API types
- `d1` (included with Cloudflare) - SQLite database

**External APIs:**
- `@google/generative-ai@0.x` - Google Gemini API
- `node-fetch` (built-in) - HTTP requests

**Development:**
- `typescript@5.x` - Type safety
- `vitest@1.x` - Testing framework
- `wrangler@3.x` - Cloudflare CLI

### Frontend (frontend/package.json)

**Core:**
- `react@18.x` - UI framework
- `react-dom@18.x` - React DOM
- `react-router-dom@6.x` - Routing

**Build Tools:**
- `vite@5.x` - Build tool
- `typescript@5.x` - Type safety
- `@vitejs/plugin-react` - React support

**Styling:**
- `tailwindcss@4.x` - CSS utility framework
- `postcss@8.x` - CSS processing
- `autoprefixer@10.x` - CSS vendor prefixes
- `@tailwindcss/postcss@4.x` - Tailwind PostCSS plugin

**UI & Icons:**
- `lucide-react@0.x` - Icon library
- `clsx@2.x` - Class name utility
- `class-variance-authority@0.x` - Component variants

**Linting:**
- `eslint@8.x` - Code linting
- `typescript-eslint@6.x` - TypeScript linting

---

## 🔐 API Credentials Required

### 1. Telegram Bot Token

**How to get:**
1. Message @BotFather on Telegram
2. Send `/newbot`
3. Choose bot name: "MOCU Assistant"
4. Choose bot username: "mocu_assistant_bot" (must be unique)
5. Copy the token: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`

**Format:** `<numeric_id>:<alphanumeric_token>`
**Usage:** Backend environment variable `TELEGRAM_BOT_TOKEN`
**Scope:** Allows sending messages, receiving updates
**Rotation:** Can regenerate from @BotFather anytime

### 2. Telegram Secret Token

**How to get:**
1. Generate random 32+ character string:
   ```bash
   openssl rand -base64 32
   # or on Windows:
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
2. Use for HMAC verification of webhook updates

**Format:** Alphanumeric + special chars, min 32 chars
**Usage:** Backend environment variable `TELEGRAM_SECRET`
**Scope:** Secures webhook, only you know it
**Important:** Don't share publicly, rotate quarterly

### 3. Google Gemini API Key

**How to get:**
1. Go to: https://console.cloud.google.com
2. Create new project: "MOCU"
3. Enable APIs:
   - Google AI API
   - Generative Language API (for Gemini)
4. Go to "Credentials"
5. Create API Key: `AIzaSyD...`
6. Set up quota: recommend 1000 requests/day minimum

**Format:** `AIzaSyD...` (40+ characters)
**Usage:** Backend environment variable `GEMINI_API_KEY`
**Scope:** Intent detection for Telegram bot
**Limits:** Check Google Cloud quotas (free tier: 1000 calls/month)
**Cost:** Free tier sufficient for MVP

### 4. JWT Secret

**How to get:**
1. Generate cryptographically secure random:
   ```bash
   # Linux/macOS
   openssl rand -base64 32

   # Windows PowerShell
   $bytes = New-Object byte[] 32
   [Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
   [Convert]::ToBase64String($bytes)
   ```
2. Min 32 characters, longer is more secure
3. Example: `PqV8wK3dLm9nX2yJ5rT1bS4fG6hU7iO9PqV8wK3dLm9nX2yJ5rT1bS4fG6hU7iO9`

**Format:** Base64-encoded random bytes, 32+ chars
**Usage:** Backend environment variable `JWT_SECRET`
**Scope:** Signing user authentication tokens
**Important:** NEVER share, change before production deployment
**Rotation:** Change if compromised, regenerate annually

---

## ☁️ Cloudflare Resources

### Free Tier (Suitable for MVP)

| Resource | Free Limit | Notes |
|---|---|---|
| Workers | 100,000 requests/day | More than enough |
| D1 Database | 3 databases | 1 is enough |
| KV Storage | 10GB storage | Rate limiting uses minimal space |
| Pages | Unlimited bandwidth | Static file deployment |
| R2 (optional) | 15GB storage | Not needed for MVP |

### Pricing (if exceeding free tier)

| Resource | Cost | Notes |
|---|---|---|
| Workers | $0.50 per million requests | CPUs are fast |
| D1 Reads | $0.40 per 1M reads | Very cheap |
| D1 Writes | $1.00 per 1M writes | Still cheap |
| KV | $0.50 per million writes | Minimal usage |
| Pages | Free (included) | Generous free tier |

---

## 🗄️ Database Schema

### Tables Created

**users**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  telegram_chat_id TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**notes**
```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,
  is_archived INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**todos**
```sql
CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'completed')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes:** All foreign keys and user_id are indexed for performance.

---

## 🔌 Environment Variables

### Backend (.env or wrangler.toml)

**Required:**
```env
JWT_SECRET=<32+ char random string>
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_SECRET=<32+ char random string>
GEMINI_API_KEY=<from Google Cloud>
```

**Optional/Auto-Set:**
```env
API_VERSION=1.0.0
LOG_LEVEL=info          # Can be: debug, info, warn, error
```

### Frontend (.env.local / .env.production)

**Development:**
```env
VITE_API_URL=http://localhost:8788
```

**Production:**
```env
VITE_API_URL=https://mocu-api.<account>.workers.dev
```

---

## 🌐 Network Requirements

### Outbound Connections (Backend needs to reach)

| Service | URL | Purpose | Port |
|---|---|---|---|
| Google Gemini API | `generativelanguage.googleapis.com` | Intent detection | 443 |
| Telegram API | `api.telegram.org` | Send/receive messages | 443 |
| Cloudflare D1 | Internal | Database access | 443 |

### Inbound Connections (Client needs to reach)

| Component | URL | Purpose |
|---|---|---|
| Frontend | `https://mocu-frontend.<account>.pages.dev` | Web UI |
| Backend API | `https://mocu-api.<account>.workers.dev` | REST API |
| Telegram Bot | Sends updates to webhook URL | Bot messages |

### Rate Limits

| Source | Limit | Window | Notes |
|---|---|---|---|
| Telegram Login | 10 attempts | 1 hour | Per chat_id |
| Telegram Messages | 20 messages | 1 hour | Per user |
| Gemini API | 1000 calls | 1 month | Free tier (Google) |
| Cloudflare Workers | 100,000 requests | 1 day | Free tier |

---

## 📊 Disk Space Requirements

| Component | Size | Notes |
|---|---|---|
| Backend node_modules | ~500MB | npm install |
| Frontend node_modules | ~800MB | npm install |
| Source code | ~5MB | All source files |
| Local D1 database | <10MB | SQLite database |
| Build artifacts (dist/) | ~100KB | Minified + gzipped |
| **Total** | **~1.5GB** | For development |

Production space is negligible (Workers + Pages are serverless).

---

## 🔒 Security Requirements

### Passwords & Secrets
- ✅ JWT_SECRET: Min 32 chars, cryptographically random
- ✅ TELEGRAM_SECRET: Min 32 chars, never share publicly
- ✅ API Keys: Store in Cloudflare Secrets, never commit to git

### HTTPS/TLS
- ✅ All communication encrypted (automatic with Workers + Pages)
- ✅ CORS configured to specific domains only
- ✅ Telegram webhook signed with HMAC-SHA256

### Data Protection
- ✅ User data isolated (each user sees only their data)
- ✅ Database queries filtered by user_id
- ✅ JWT tokens expire after 24 hours
- ✅ No sensitive data in error messages (production)

---

## 🚀 Performance Requirements

### Minimum Acceptable Performance

| Metric | Target | Notes |
|---|---|---|
| API Response Time | <500ms | P50 latency |
| Page Load Time | <2s | Full load time |
| Database Query | <100ms | Simple queries |
| Telegram Response | <10s | Bot reply latency |

### Cloudflare Metrics (Free Tier provides)

- Workers CPU Time: <30ms per request (plenty)
- D1 Query Performance: <10ms typical
- KV Lookup: <1ms typical
- Bandwidth: Unlimited (within fair use)

---

## 📱 Browser Support

### Tested & Supported
- ✅ Chrome 120+
- ✅ Firefox 121+
- ✅ Safari 17+
- ✅ Edge 120+
- ✅ Mobile browsers (iOS Safari 17+, Chrome Mobile)

### Features Used
- ✅ ES2020+ JavaScript
- ✅ CSS Grid & Flexbox
- ✅ CSS Custom Properties (variables)
- ✅ localStorage API
- ✅ Fetch API
- ✅ JWT handling client-side

---

## 🧪 Testing Requirements

### Recommended Test Tools
- **Unit Tests:** Vitest (configured in backend)
- **Integration Tests:** Vitest + Test utilities
- **API Testing:** curl or Postman
- **Load Testing:** Artillery or K6 (optional)

### Test Coverage Target
- Backend: Aim for 80%+ coverage
- Frontend: Visual testing + critical paths
- E2E: Manual smoke testing before deploy

---

## 📚 Documentation Requirements

The following documentation files must be maintained:

- ✅ README.md - Project overview
- ✅ SETUP.md - Development setup
- ✅ DEPLOYMENT.md - Production deployment
- ✅ API.md - Endpoint documentation
- ✅ ARCHITECTURE.md - System design
- ✅ REQUIREMENTS.md - This file

---

## ⚠️ Known Limitations

### MVP Limitations
1. **No Refresh Tokens** - JWT expires after 24h, no automatic renewal
2. **localStorage Tokens** - Not recommended for highly sensitive apps
3. **SQLite Only** - Not suitable for multi-region scaling
4. **No Rate Limit UI** - Users don't see remaining API quota
5. **No Email Notifications** - Only Telegram notifications
6. **No File Uploads** - Notes/Todos are text-only

### Scalability Limits
- SQLite: ~1GB max database size (for Cloudflare D1)
- Workers: ~10MB code limit per deployment
- KV Storage: 10GB free tier (enough for rate limiting)

---

## 🔄 Upgrade Path

### Potential Future Enhancements
1. Refresh token mechanism
2. httpOnly cookie-based auth
3. PostgreSQL migration (for larger scale)
4. Email notifications
5. File attachments for notes
6. Rich text editing
7. Collaborative notes
8. Analytics dashboard

---

## 📞 Getting Credentials Checklist

- [ ] Telegram Bot Token (from @BotFather)
- [ ] Telegram Secret (generate 32+ char string)
- [ ] Google Gemini API Key (from Google Cloud)
- [ ] JWT Secret (generate 32+ char string)
- [ ] Cloudflare Account (free tier)
- [ ] Database ID (from Cloudflare)
- [ ] KV Namespace IDs (from Cloudflare)

**Time to gather all credentials:** ~15-20 minutes

---

## 🚀 Quick Verification

Run this to verify all requirements are met:

```bash
# Node.js & npm
node --version      # Should be 18.0.0+
npm --version       # Should be 9.0.0+

# Git
git --version       # Should be 2.30.0+

# Cloudflare CLI
wrangler --version  # Should be 3.0.0+
npm install -g wrangler  # If not installed

# Database (local test)
wrangler d1 execute mocu-db --local \
  --command "SELECT 1;"

# API connectivity (after deployment)
curl https://mocu-api.<account>.workers.dev/health
```

All green? You're ready to deploy! 🚀

---

**Document Version:** 1.0.0
**Last Updated:** March 2026
**Status:** Complete & Verified
