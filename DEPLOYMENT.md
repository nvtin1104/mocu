# DEPLOYMENT - Hướng Dẫn Deploy Lên Production

Hướng dẫn chi tiết để deploy MOCU lên Cloudflare (Workers + Pages).

---

## 📋 Yêu Cầu Tiên Quyết

- ✅ Hoàn thành [SETUP.md](./SETUP.md) (local development)
- ✅ Cloudflare account (free tier đủ)
- ✅ wrangler CLI đã cài (`npm install -g wrangler`)
- ✅ 4 API credentials (xem [REQUIREMENTS.md](./REQUIREMENTS.md))

---

## 🚀 Phase 1: Cloudflare Setup

### Step 1.1: Login to Cloudflare CLI

```bash
wrangler login
```

This opens browser để authorize. Click "Allow" để grant permissions.

Verify login:
```bash
wrangler whoami
# Output: <your-cloudflare-email>
```

### Step 1.2: Create D1 Database

```bash
wrangler d1 create mocu-db

# Output:
# ✓ Successfully created new D1 database 'mocu-db'
#
# [[d1_databases]]
# binding = "DB"
# database_name = "mocu-db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**⚠️ IMPORTANT:** Sao chép `database_id` từ output

### Step 1.3: Create KV Namespaces

```bash
# Production KV namespace
wrangler kv:namespace create mocu-kv

# Output:
# ✓ Successfully created namespace with id "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Preview namespace (for local testing)
wrangler kv:namespace create mocu-kv --preview

# Output:
# ✓ Successfully created preview namespace with id "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
```

**⚠️ IMPORTANT:** Sao chép cả 2 IDs

---

## ⚙️ Phase 2: Configuration

### Step 2.1: Update wrangler.toml

Edit `backend/wrangler.toml` và thêm database_id và kv ids:

```toml
[[d1_databases]]
binding = "DB"
database_name = "mocu-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Từ Step 1.2

[[kv_namespaces]]
binding = "KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"                # Production ID từ Step 1.3
preview_id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"        # Preview ID từ Step 1.3
```

### Step 2.2: Set Secrets

```bash
cd backend

# JWT Secret
wrangler secret put JWT_SECRET
# Paste your JWT secret, then Ctrl+D to save

# Telegram Bot Token
wrangler secret put TELEGRAM_BOT_TOKEN
# Paste: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Telegram Secret
wrangler secret put TELEGRAM_SECRET
# Paste your telegram secret

# Gemini API Key
wrangler secret put GEMINI_API_KEY
# Paste your Google Gemini API key
```

Verify secrets (danh sách, không hiển thị value):
```bash
wrangler secret list
```

### Step 2.3: Apply Database Migrations

```bash
# Apply to remote D1
wrangler d1 migrations apply mocu-db --remote

# Output:
# ✓ Successfully applied migrations...

# Verify:
wrangler d1 execute mocu-db --remote --command "SELECT * FROM sqlite_master WHERE type='table';"
```

---

## 🔧 Phase 3: Deploy Backend

### Step 3.1: Type Check & Build

```bash
cd backend

# Check for TypeScript errors
npm run type-check

# Build for production
npm run build
```

**⚠️ NOTE:** Có thể có TypeScript errors từ code cũ. Fix chúng trước deploy:
```bash
# File: src/routes/notes.ts, todos.ts - Fix c.get("userId") type issue
# File: src/routes/telegram.ts - Remove unused imports
```

### Step 3.2: Deploy to Cloudflare Workers

```bash
cd backend

npm run deploy

# Output:
# ✓ Successfully published your Worker to
#   https://mocu-api.<account>.workers.dev
```

**⚠️ IMPORTANT:** Sao chép URL của worker này

### Step 3.3: Verify Backend Deployment

```bash
# Test health endpoint
curl https://mocu-api.<account>.workers.dev/health

# Expected output:
# {
#   "status": "ok",
#   "timestamp": "2024-03-25T10:00:00Z",
#   "version": "1.0.0"
# }
```

### Step 3.4: Register Telegram Webhook

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mocu-api.<account>.workers.dev/api/telegram/webhook",
    "secret_token": "<YOUR_TELEGRAM_SECRET>"
  }'

# Expected output:
# {"ok":true,"result":true,"description":"Webhook was set"}
```

Verify webhook:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo

# Check the "url" matches your deployment URL
```

---

## 🎨 Phase 4: Deploy Frontend

### Step 4.1: Create .env.production

Tạo file `frontend/.env.production`:

```env
VITE_API_URL=https://mocu-api.<account>.workers.dev
```

(Replace `<account>` với Cloudflare account ID)

### Step 4.2: Build Frontend

```bash
cd frontend

npm run build

# Output:
# ✓ built in XXms
#
# dist/
#   index.html                 X.XX kb │ brotli: X.XX kb
#   assets/index-XXXX.js      XX.XX kb │ brotli: X.XX kb
```

### Step 4.3: Deploy to Cloudflare Pages

```bash
wrangler pages deploy dist --project-name mocu-frontend

# Output:
# ✓ Deployment complete!
#   URL: https://mocu-frontend.<account>.pages.dev
#   Files: 3 files uploaded
```

**⚠️ IMPORTANT:** Sao chép URL này

### Step 4.4: Verify Frontend Deployment

```bash
# Open in browser
https://mocu-frontend.<account>.pages.dev

# Should see MOCU login page
```

---

## 🔒 Phase 5: Security & CORS Update

### Step 5.1: Update CORS in Backend

Now that you have production URL, update CORS:

Edit `backend/src/index.ts`:

```typescript
app.use(
  cors({
    origin: (origin) => {
      const allowed = [
        'http://localhost:5173',
        'http://localhost:4000',
        'http://localhost:3000',
        'https://mocu-frontend.<account>.pages.dev'  // Add this
      ]
      return allowed.includes(origin) ? origin : ''
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    maxAge: 86400
  })
)
```

### Step 5.2: Redeploy Backend

```bash
cd backend
npm run deploy

# Verify CORS works by testing from frontend
```

---

## ✅ Phase 6: End-to-End Testing

### Test 1: Login Flow

```bash
1. Go to https://mocu-frontend.<account>.pages.dev
2. Find your Telegram Chat ID:
   - Message @userinfobot on Telegram
   - Copy your numeric ID
3. Paste ID into login form
4. Should redirect to /notes
```

### Test 2: Create Note

```bash
1. On /notes page, fill "Title" and "Content"
2. Click "Add Note"
3. Should appear in notes list
4. Check database:
   wrangler d1 execute mocu-db --remote \
     --command "SELECT * FROM notes LIMIT 1;"
```

### Test 3: Telegram Bot

```bash
1. Message your bot anything
2. Should respond with intent detection
3. Try: "create note hello world"
4. Check /notes page - note should appear
```

### Test 4: CORS Preflight

```bash
# Test CORS headers
curl -i -X OPTIONS https://mocu-api.<account>.workers.dev/api/notes \
  -H "Origin: https://mocu-frontend.<account>.pages.dev" \
  -H "Access-Control-Request-Method: GET"

# Should return 200 with CORS headers
```

---

## 📊 Phase 7: Monitoring & Maintenance

### Monitor Backend

```bash
# View real-time logs
wrangler tail mocu-api

# View metrics in Cloudflare Dashboard:
# Workers > mocu-api > Metrics
```

### Monitor Database

```bash
# Query database
wrangler d1 execute mocu-db --remote \
  --command "SELECT COUNT(*) as user_count FROM users;"

# Check recent migrations
wrangler d1 migrations list mocu-db --remote
```

### Monitor Frontend

```bash
# View deployment logs
wrangler pages deployment list --project-name mocu-frontend

# View traffic in Cloudflare Dashboard:
# Pages > mocu-frontend > Analytics
```

---

## 🆘 Troubleshooting Deployment

### Backend Deploy Fails: "Authentication failed"

```bash
# Re-login
wrangler logout
wrangler login

# Verify account
wrangler whoami
```

### Database Migration Fails

```bash
# Check migration status
wrangler d1 migrations list mocu-db --remote

# Re-apply
wrangler d1 migrations apply mocu-db --remote --force
```

### Frontend Can't Connect to API

```bash
1. Check .env.production has correct VITE_API_URL
2. Verify CORS is updated in backend
3. Check backend is deployed: curl https://mocu-api...
4. Check network tab in browser DevTools
```

### Telegram Webhook Not Working

```bash
# Check webhook
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Re-set webhook if needed
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d "url=https://mocu-api.<account>.workers.dev/api/telegram/webhook"
```

### 502 Bad Gateway Error

```bash
# Check Workers logs
wrangler tail mocu-api --format pretty

# Redeploy
cd backend && npm run deploy

# Check database connection
wrangler d1 execute mocu-db --remote --command "SELECT 1;"
```

---

## 🔄 Rollback Procedure

Nếu deployment bị broken:

```bash
# Cloudflare Pages - Automatic (xem deployment list)
wrangler pages deployment list --project-name mocu-frontend

# Select previous deployment and promote it

# Cloudflare Workers - Manual
cd backend
git checkout HEAD~1  # Back to previous commit
npm run deploy
```

---

## 📈 Post-Deployment Checklist

- [ ] Backend health check passes
- [ ] Frontend loads without errors
- [ ] Login with Telegram Chat ID works
- [ ] Can create/read/update/delete notes
- [ ] Can create/complete todos
- [ ] Telegram bot responds to messages
- [ ] CORS errors don't appear in browser console
- [ ] Database has user records
- [ ] Secrets are all set (wrangler secret list)
- [ ] Webhook is registered (getWebhookInfo returns URL)
- [ ] Performance is acceptable (check Workers metrics)

---

## 🎓 Optional: Custom Domain

To use your own domain instead of `*.workers.dev` and `*.pages.dev`:

```bash
# Add domain to Cloudflare account first

# For Workers (API)
wrangler deploy --compatibility-date 2025-03-25

# For Pages (Frontend)
wrangler pages publish dist \
  --project-name mocu-frontend \
  --branch production \
  --build-output-dir dist
```

Then configure DNS in Cloudflare dashboard.

---

## 📞 Support

- **Cloudflare Docs:** https://developers.cloudflare.com/
- **Workers:** https://developers.cloudflare.com/workers/
- **D1 Database:** https://developers.cloudflare.com/d1/
- **Pages:** https://developers.cloudflare.com/pages/

---

## 🎉 Deployment Complete!

Your MOCU is now live!

**Production URLs:**
- Backend: https://mocu-api.<account>.workers.dev
- Frontend: https://mocu-frontend.<account>.pages.dev
- Telegram: Message your bot to start using

**Next steps:**
- Monitor logs and metrics
- Set up error tracking (optional)
- Plan for scaling if needed
- Regular database backups

Enjoy! 🚀
