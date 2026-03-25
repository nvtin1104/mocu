# SETUP - Hướng Dẫn Cài Đặt & Phát Triển

Hướng dẫn chi tiết để setup MOCU cho phát triển local và production.

---

## 📋 Yêu Cầu Tiên Quyết

### System Requirements
- **Node.js:** 18.0.0 hoặc mới hơn
- **npm:** 9.0.0 hoặc mới hơn
- **Git:** 2.30.0 hoặc mới hơn
- **OS:** Windows, macOS, hoặc Linux

### API Credentials Cần Thiết
1. **Telegram Bot Token** — từ @BotFather trên Telegram
2. **Google Gemini API Key** — từ Google Cloud Console
3. **Cloudflare Account** — để deploy (xem [REQUIREMENTS.md](./REQUIREMENTS.md))

---

## 🔑 Bước 1: Tạo Telegram Bot

### 1.1 Tạo Bot mới
```
1. Mở Telegram, tìm @BotFather
2. Gửi /newbot
3. Đặt tên: "MOCU Assistant" (hoặc tên khác)
4. Đặt username: "mocu_assistant_bot" (phải unique)
5. Sao chép Bot Token (VD: 123456:ABC-DEF1234...)
```

### 1.2 Cấu Hình Bot
```
@BotFather > /mybots > Select your bot > Bot Settings

- Inline Queries: OFF
- Group Privacy: ON (bot only responds to /commands in groups)
- Command List: Set commands để hiển thị trong menu
```

### 1.3 Lưu Bot Token
Bạn sẽ sử dụng token này trong `.env` sau.

---

## 🔐 Bước 2: Tạo Google Gemini API Key

### 2.1 Setup Google Cloud
```bash
1. Truy cập: https://console.cloud.google.com
2. Tạo project mới: "MOCU"
3. Enable APIs:
   - Google AI API
   - Vertex AI API (recommended)
4. Tạo API Key (không cần OAuth2 nếu dùng simple auth)
```

### 2.2 Lấy API Key
```bash
1. Vào "Credentials" trong Google Cloud Console
2. Create Credential > API Key
3. Sao chép key (VD: AIzaSyD...)
4. Lưu vào biến môi trường
```

Hoặc dùng quickstart từ: https://ai.google.dev/tutorials/python_quickstart

---

## 💻 Bước 3: Clone & Setup Project

### 3.1 Clone Repository
```bash
git clone <repository-url>
cd mocu
```

### 3.2 Tạo JWT Secret
```bash
# Linux/macOS
openssl rand -base64 32

# Windows (PowerShell)
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RNGCryptoServiceProvider]::new()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Lưu kết quả để sử dụng sau.

---

## 🔧 Bước 4: Setup Backend

### 4.1 Install Dependencies
```bash
cd backend
npm install
```

### 4.2 Setup Environment
Tạo file `backend/.env.local`:
```env
JWT_SECRET=your-jwt-secret-from-step-3-2
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_SECRET=your-telegram-secret-from-step-1
GEMINI_API_KEY=your-google-gemini-key-from-step-2
API_VERSION=1.0.0
LOG_LEVEL=debug
```

**⚠️ Quan Trọng:** Không commit `.env.local` lên git!

### 4.3 Setup Database (Local)
```bash
# Create local D1 database
npm run db:migrate:local

# Verify database setup
ls -la .wrangler/state/v3/d1/
```

Database sẽ chứa 3 bảng: `users`, `notes`, `todos`

### 4.4 Start Backend Server
```bash
npm run dev
```

Expected output:
```
> wrangler dev --local

⛅️ wrangler 3.x.x
▶ [watch] Rebuild complete (in XXms)
 ⛅️  Wrangler is listening on http://localhost:8788
```

Backend now running at `http://localhost:8788`

---

## 🎨 Bước 5: Setup Frontend

### 5.1 Install Dependencies
```bash
cd ../frontend
npm install
```

### 5.2 Setup Environment
Tạo file `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:8788
```

### 5.3 Start Frontend Dev Server
```bash
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

Frontend now running at `http://localhost:5173` (hoặc port khác nếu 5173 đang dùng)

---

## ✅ Bước 6: Verify Installation

### 6.1 Test Backend Health
```bash
curl http://localhost:8788/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-03-25T10:00:00.000Z",
  "version": "1.0.0"
}
```

### 6.2 Test Frontend
```bash
# In browser
open http://localhost:5173
# hoặc
http://localhost:4000 (if port 5173 is taken)
```

Should see MOCU Login page

### 6.3 Test Login Flow
```bash
1. Truy cập http://localhost:5173
2. Nhập Telegram Chat ID của bạn
   (Nhắn tin bất kỳ cho @userinfobot để lấy ID)
3. Bạn sẽ được redirect đến /notes
4. Backend sẽ tạo user mới trong D1
```

### 6.4 Test Notes CRUD
```bash
1. Truy cập /notes page
2. Tạo ghi chú mới
3. Xem nó xuất hiện trong danh sách
4. Edit hoặc xóa
```

---

## 🧪 Bước 7: Run Tests

### Backend Tests
```bash
cd backend
npm test

# Expected output:
# ✓ POST /auth/telegram tests (X tests)
# ✓ Notes API tests (X tests)
# ✓ Todos API tests (X tests)
```

### Type Checking
```bash
cd backend
npm run type-check

cd ../frontend
npm run build
```

---

## 🤖 Bước 8: Setup Telegram Webhook (Optional - Local Testing)

Để test bot trên local, bạn có 2 option:

### Option A: Polling (Recommended cho Local)
```
@BotFather > /mybots > Bot Settings > Webhook > /setcommands
Disable webhook, polling sẽ tự enable
```

### Option B: Tunnel Local Server
```bash
# Cài ngrok
npm install -g ngrok

# Run ngrok
ngrok http 8788
# Output: https://abc123.ngrok.io

# Set webhook
curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://abc123.ngrok.io/api/telegram/webhook"}'
```

---

## 📁 Project Structure

```
mocu/
├── backend/
│   ├── src/
│   │   ├── index.ts                  # Main app
│   │   ├── middleware/auth.ts        # JWT auth
│   │   ├── routes/                   # API routes
│   │   ├── services/                 # External services
│   │   └── tests/                    # Test files
│   ├── migrations/0001_init.sql      # DB schema
│   ├── wrangler.toml                 # Cloudflare config
│   ├── .env.local                    # Env vars (not committed)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                   # Routes
│   │   ├── hooks/                    # Custom hooks
│   │   ├── lib/api.ts                # API client
│   │   ├── pages/                    # Pages
│   │   └── components/               # Components
│   ├── .env.local                    # Env vars (not committed)
│   ├── tailwind.config.js
│   └── package.json
│
├── README.md                         # Project overview
├── SETUP.md                          # This file
├── DEPLOYMENT.md                     # Production guide
├── API.md                            # API docs
└── REQUIREMENTS.md                   # Requirements
```

---

## 🚀 Useful Commands

### Backend
```bash
cd backend

npm run dev              # Start dev server (8788)
npm test                 # Run tests
npm run type-check       # Check TypeScript
npm run build            # Build for production
npm run deploy           # Deploy to Cloudflare (need credentials)
npm run db:migrate:local # Apply migrations locally
```

### Frontend
```bash
cd frontend

npm run dev              # Start dev server (5173)
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Lint code
```

---

## 🐛 Troubleshooting

### Port Already In Use
```bash
# Find process using port 8788
lsof -i :8788        # macOS/Linux
netstat -ano | grep 8788  # Windows

# Kill process
kill -9 <PID>         # macOS/Linux
taskkill /PID <PID> /F   # Windows
```

### Database Not Found
```bash
# Reinitialize local database
cd backend
rm -rf .wrangler/state/
npm run db:migrate:local
```

### JWT_SECRET Not Found
```bash
# Check .env.local exists
cat backend/.env.local

# Regenerate secret if needed
# (See step 3.2)
```

### Gemini API Errors
```bash
# Verify API key in Google Cloud
# Check quotas and billing: console.cloud.google.com

# Check API is enabled in project settings
# Test with curl:
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Frontend Can't Connect to Backend
```bash
# Check VITE_API_URL in .env.local
cat frontend/.env.local

# Should be: http://localhost:8788

# Check backend is running
curl http://localhost:8788/health

# Check CORS settings in backend/src/index.ts
# Should include: http://localhost:5173, http://localhost:4000
```

---

## 📝 Development Workflow

### Adding a New Feature

1. Create branch
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make changes in backend/frontend

3. Test locally
   ```bash
   cd backend && npm test
   cd ../frontend && npm run build
   ```

4. Type check
   ```bash
   npm run type-check
   ```

5. Commit
   ```bash
   git add .
   git commit -m "feat: add my feature"
   ```

6. Push & create PR
   ```bash
   git push origin feature/my-feature
   ```

---

## 🔒 Security Best Practices (Local)

- ✅ Never commit `.env.local`
- ✅ Use strong JWT_SECRET (min 32 chars)
- ✅ Change TELEGRAM_SECRET regularly
- ✅ Don't share API keys in messages/emails
- ✅ Rotate secrets before production deployment
- ✅ Use httpOnly cookies for tokens (not localStorage) in production

---

## 📚 Next Steps

1. ✅ You've set up development environment
2. 🧪 Run tests to verify: `cd backend && npm test`
3. 🚀 Ready to develop! Start with [API.md](./API.md) to understand endpoints
4. 🌐 For production: Follow [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 💬 Need Help?

- Check [REQUIREMENTS.md](./REQUIREMENTS.md) for detailed requirements
- Read [API.md](./API.md) for endpoint documentation
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Review error messages in console (backend dev logs show details)

Happy coding! 🚀
