# 🤖 MOCU — Personal AI Assistant

## Prompt Dự Án Hoàn Chỉnh

> **Tên dự án:** MOCU (Modern-aware Curious Unique Assistant)
> **Stack:** Cloudflare Workers + Pages | Gemini API + MiniMax API | Telegram Bot | React + shadcn/ui + Tailwind + Lucide Icons

---

## 1. TỔNG QUAN KIẾN TRÚC

### 1.1 Sơ đồ hệ thống

```
┌──────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE ECOSYSTEM                      │
│                                                              │
│  ┌─────────────┐    ┌──────────────────────────────────────┐ │
│  │  CF Pages    │    │  CF Worker (API Backend)             │ │
│  │  (Frontend)  │───▶│                                      │ │
│  │  React SPA   │    │  ├─ /api/notes/*                     │ │
│  └─────────────┘    │  ├─ /api/projects/*                  │ │
│                      │  ├─ /api/todos/*                     │ │
│  ┌─────────────┐    │  ├─ /api/alarms/*                    │ │
│  │  Telegram    │───▶│  ├─ /api/schedules/*                │ │
│  │  Bot Webhook │    │  ├─ /api/chat/*  (AI Router)        │ │
│  └─────────────┘    │  └─ /api/telegram/webhook            │ │
│                      └──────────┬───────────────────────────┘ │
│                                 │                             │
│  ┌──────────────┐    ┌─────────▼─────────┐                  │
│  │  CF Cron      │    │  Cloudflare D1     │                  │
│  │  Triggers     │───▶│  (SQLite DB)       │                  │
│  └──────────────┘    └───────────────────┘                  │
│                                                              │
│  ┌──────────────┐    ┌───────────────────┐                  │
│  │  CF KV        │    │  CF Queues         │                  │
│  │  (Cache/      │    │  (Background Jobs) │                  │
│  │   Sessions)   │    └───────────────────┘                  │
│  └──────────────┘                                           │
│                                                              │
│          ┌──────────────┬──────────────────┐                │
│          │  Gemini API  │  MiniMax API      │                │
│          │  (Text/Chat) │  (Voice/Special)  │                │
│          └──────────────┴──────────────────┘                │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Công nghệ sử dụng

| Layer | Công nghệ | Vai trò |
|-------|-----------|---------|
| Frontend | Cloudflare Pages, React (Vite), Tailwind CSS, shadcn/ui, Lucide Icons | Giao diện người dùng SPA |
| Backend API | Cloudflare Workers (Hono framework) | REST API + Webhook handler |
| Database | Cloudflare D1 (SQLite) | Lưu trữ chính |
| Cache & Session | Cloudflare KV | Session, cache AI response, rate limiting |
| Background Jobs | Cloudflare Queues + Cron Triggers | Nhắc nhở, báo thức, jobs định kỳ |
| AI - Text | Google Gemini API (gemini-2.0-flash) | Chat, phân tích intent, tóm tắt |
| AI - Multimedia | MiniMax API | Voice generation, xử lý multimedia |
| Bot | Telegram Bot API | Giao tiếp qua Telegram |
| Auth | Cloudflare Access hoặc JWT tự quản | Xác thực người dùng |

---

## 2. CẤU TRÚC DỰ ÁN

```
mocu/
├── frontend/                    # Cloudflare Pages
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── MobileNav.tsx
│   │   │   │   └── AppShell.tsx
│   │   │   ├── notes/
│   │   │   │   ├── NoteEditor.tsx
│   │   │   │   ├── NoteList.tsx
│   │   │   │   └── NoteCard.tsx
│   │   │   ├── projects/
│   │   │   │   ├── ProjectBoard.tsx
│   │   │   │   ├── ProjectCard.tsx
│   │   │   │   └── ProjectForm.tsx
│   │   │   ├── todos/
│   │   │   │   ├── TodoList.tsx
│   │   │   │   ├── TodoItem.tsx
│   │   │   │   └── TodoFilters.tsx
│   │   │   ├── alarms/
│   │   │   │   ├── AlarmList.tsx
│   │   │   │   ├── AlarmForm.tsx
│   │   │   │   └── AlarmCard.tsx
│   │   │   ├── schedules/
│   │   │   │   ├── Calendar.tsx
│   │   │   │   ├── ScheduleForm.tsx
│   │   │   │   └── DayView.tsx
│   │   │   └── chat/
│   │   │       ├── ChatWindow.tsx
│   │   │       ├── ChatInput.tsx
│   │   │       └── ChatMessage.tsx
│   │   ├── hooks/
│   │   │   ├── useNotes.ts
│   │   │   ├── useProjects.ts
│   │   │   ├── useTodos.ts
│   │   │   ├── useAlarms.ts
│   │   │   ├── useSchedules.ts
│   │   │   └── useChat.ts
│   │   ├── lib/
│   │   │   ├── api.ts            # API client
│   │   │   ├── utils.ts
│   │   │   └── constants.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── NotesPage.tsx
│   │   │   ├── ProjectsPage.tsx
│   │   │   ├── TodosPage.tsx
│   │   │   ├── AlarmsPage.tsx
│   │   │   ├── SchedulePage.tsx
│   │   │   └── ChatPage.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                     # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts             # Hono app entry
│   │   ├── routes/
│   │   │   ├── notes.ts
│   │   │   ├── projects.ts
│   │   │   ├── todos.ts
│   │   │   ├── alarms.ts
│   │   │   ├── schedules.ts
│   │   │   ├── chat.ts
│   │   │   └── telegram.ts
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── gemini.ts        # Gemini API client
│   │   │   │   ├── minimax.ts       # MiniMax API client
│   │   │   │   ├── intent-detector.ts
│   │   │   │   └── prompts.ts       # System prompts
│   │   │   ├── telegram/
│   │   │   │   ├── bot.ts
│   │   │   │   ├── commands.ts
│   │   │   │   └── handlers.ts
│   │   │   └── cron/
│   │   │       ├── alarm-checker.ts
│   │   │       ├── daily-summary.ts
│   │   │       ├── reminder-sender.ts
│   │   │       └── cleanup.ts
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   └── migrations/
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── cors.ts
│   │   │   └── rate-limit.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── date.ts
│   │       └── validators.ts
│   ├── wrangler.toml
│   └── package.json
│
└── shared/                      # Shared types
    └── types.ts
```

---

## 3. DATABASE SCHEMA (Cloudflare D1)

```sql
-- ============================================
-- MOCU Database Schema — Cloudflare D1 (SQLite)
-- ============================================

-- Người dùng
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  telegram_chat_id TEXT UNIQUE,
  username TEXT NOT NULL,
  email TEXT UNIQUE,
  timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',
  preferences TEXT DEFAULT '{}',  -- JSON: theme, language, notification settings
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Ghi chú
CREATE TABLE notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT DEFAULT '[]',          -- JSON array: ["work", "idea"]
  is_pinned INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  color TEXT DEFAULT 'default',    -- Mã màu note
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_updated ON notes(user_id, updated_at DESC);

-- Dự án
CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','completed','archived')),
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',      -- Lucide icon name
  deadline TEXT,                   -- ISO date
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_projects_user ON projects(user_id);

-- Todo items (thuộc về project hoặc độc lập)
CREATE TABLE todos (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done','cancelled')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
  due_date TEXT,                   -- ISO datetime
  tags TEXT DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_todos_user ON todos(user_id);
CREATE INDEX idx_todos_project ON todos(project_id);
CREATE INDEX idx_todos_due ON todos(user_id, due_date);
CREATE INDEX idx_todos_status ON todos(user_id, status);

-- Báo thức & nhắc nhở
CREATE TABLE alarms (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  alarm_time TEXT NOT NULL,        -- ISO datetime
  repeat_pattern TEXT DEFAULT 'none' CHECK(repeat_pattern IN (
    'none','daily','weekdays','weekends','weekly','monthly','custom'
  )),
  repeat_config TEXT DEFAULT '{}', -- JSON: { days: [1,3,5], interval: 2 }
  is_active INTEGER DEFAULT 1,
  last_triggered TEXT,
  notification_channels TEXT DEFAULT '["telegram"]', -- JSON array
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_alarms_time ON alarms(user_id, alarm_time);
CREATE INDEX idx_alarms_active ON alarms(is_active, alarm_time);

-- Lịch trình / Events
CREATE TABLE schedules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  start_time TEXT NOT NULL,
  end_time TEXT,
  is_all_day INTEGER DEFAULT 0,
  recurrence TEXT DEFAULT 'none',  -- none, daily, weekly, monthly, yearly
  recurrence_config TEXT DEFAULT '{}',
  reminder_minutes INTEGER DEFAULT 15, -- Nhắc trước bao nhiêu phút
  color TEXT DEFAULT '#6366f1',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_schedules_time ON schedules(user_id, start_time);

-- Lịch sử chat với AI
CREATE TABLE chat_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',      -- JSON: { intent, actions_taken, model_used }
  source TEXT DEFAULT 'web' CHECK(source IN ('web','telegram')),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_chat_user ON chat_history(user_id, created_at DESC);

-- Log các actions AI đã thực hiện
CREATE TABLE ai_action_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_message_id TEXT REFERENCES chat_history(id),
  action_type TEXT NOT NULL,       -- create_note, create_todo, set_alarm, etc.
  action_payload TEXT NOT NULL,    -- JSON: dữ liệu action
  result TEXT DEFAULT 'success' CHECK(result IN ('success','failed','pending')),
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_actions_user ON ai_action_log(user_id, created_at DESC);
```

---

## 4. BACKEND API (Cloudflare Worker + Hono)

### 4.1 Cấu hình wrangler.toml

```toml
name = "mocu-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[triggers]
crons = [
  "* * * * *",          # Mỗi phút — check alarms
  "0 7 * * *",          # 7h sáng — daily summary
  "0 22 * * *",         # 10h tối — tomorrow preview
  "0 0 * * 0",          # Chủ nhật — weekly cleanup
]

[[d1_databases]]
binding = "DB"
database_name = "mocu-db"
database_id = "<your-d1-id>"

[[kv_namespaces]]
binding = "KV"
id = "<your-kv-id>"

[[queues.producers]]
binding = "NOTIFICATION_QUEUE"
queue = "mocu-notifications"

[[queues.consumers]]
queue = "mocu-notifications"
max_batch_size = 10
max_batch_timeout = 30

[vars]
ENVIRONMENT = "production"
TELEGRAM_BOT_USERNAME = "mocu_assistant_bot"

# Secrets (đặt qua wrangler secret):
# GEMINI_API_KEY
# MINIMAX_API_KEY
# MINIMAX_GROUP_ID
# TELEGRAM_BOT_TOKEN
# JWT_SECRET
# AUTH_PASSWORD
```

### 4.2 API Endpoints

```
=== NOTES ===
GET    /api/notes                 # List notes (query: ?search=&tags=&pinned=&archived=)
POST   /api/notes                 # Create note
GET    /api/notes/:id             # Get note
PUT    /api/notes/:id             # Update note
DELETE /api/notes/:id             # Delete note
PATCH  /api/notes/:id/pin        # Toggle pin
PATCH  /api/notes/:id/archive    # Toggle archive

=== PROJECTS ===
GET    /api/projects              # List projects (?status=active)
POST   /api/projects              # Create project
GET    /api/projects/:id          # Get project with todos + schedules
PUT    /api/projects/:id          # Update project
DELETE /api/projects/:id          # Delete project
GET    /api/projects/:id/stats    # Project statistics

=== TODOS ===
GET    /api/todos                 # List todos (?project_id=&status=&priority=&due=today)
POST   /api/todos                 # Create todo
GET    /api/todos/:id             # Get todo
PUT    /api/todos/:id             # Update todo
DELETE /api/todos/:id             # Delete todo
PATCH  /api/todos/:id/status     # Update status only
POST   /api/todos/reorder        # Reorder todos (body: { ids: [...] })

=== ALARMS ===
GET    /api/alarms                # List alarms (?active=true)
POST   /api/alarms                # Create alarm
GET    /api/alarms/:id            # Get alarm
PUT    /api/alarms/:id            # Update alarm
DELETE /api/alarms/:id            # Delete alarm
PATCH  /api/alarms/:id/toggle    # Toggle on/off

=== SCHEDULES ===
GET    /api/schedules             # List events (?from=&to=&project_id=)
POST   /api/schedules             # Create event
GET    /api/schedules/:id         # Get event
PUT    /api/schedules/:id         # Update event
DELETE /api/schedules/:id         # Delete event
GET    /api/schedules/today       # Today's events
GET    /api/schedules/week        # This week's events

=== CHAT (AI) ===
POST   /api/chat                  # Send message, AI processes + returns response
GET    /api/chat/history          # Chat history (?limit=50&offset=0)
DELETE /api/chat/history          # Clear chat history

=== TELEGRAM ===
POST   /api/telegram/webhook      # Telegram webhook endpoint
POST   /api/telegram/set-webhook  # Register webhook URL

=== DASHBOARD ===
GET    /api/dashboard             # Aggregated: today's todos, alarms, schedule, stats
```

### 4.3 AI Intent Detection System

```typescript
// === services/ai/intent-detector.ts ===

// System prompt cho Gemini để detect intent từ tin nhắn người dùng
export const INTENT_DETECTION_PROMPT = `
Bạn là MOCU, trợ lý cá nhân thông minh. Phân tích tin nhắn của người dùng
và trả về JSON mô tả intent + entities.

## Các Intent được hỗ trợ:

1. CREATE_NOTE       — Tạo ghi chú mới
2. CREATE_TODO       — Tạo công việc cần làm
3. CREATE_PROJECT    — Tạo dự án mới
4. SET_ALARM         — Đặt báo thức / nhắc nhở
5. CREATE_SCHEDULE   — Tạo lịch hẹn / sự kiện
6. QUERY_NOTES       — Tìm kiếm ghi chú
7. QUERY_TODOS       — Hỏi về công việc (hôm nay làm gì, deadline, ...)
8. QUERY_SCHEDULE    — Hỏi về lịch (hôm nay có gì, tuần này, ...)
9. UPDATE_TODO       — Cập nhật trạng thái todo (hoàn thành, hủy, ...)
10. UPDATE_ALARM     — Thay đổi báo thức
11. GENERAL_CHAT     — Chat thông thường, hỏi đáp chung
12. SUMMARIZE        — Tóm tắt notes/todos/projects
13. SUGGEST          — Gợi ý, lên kế hoạch

## Quy tắc phân tích:
- Timezone mặc định: Asia/Ho_Chi_Minh (UTC+7)
- "mai" = ngày mai, "tuần sau" = thứ 2 tuần sau
- "chiều" = 14:00, "tối" = 19:00, "sáng" = 8:00 (nếu không chỉ rõ giờ)
- Nếu không rõ intent → GENERAL_CHAT
- Một tin nhắn có thể chứa NHIỀU intent

## Format trả về (JSON only, không markdown):
{
  "intents": [
    {
      "type": "CREATE_TODO",
      "confidence": 0.95,
      "entities": {
        "title": "Mua sữa",
        "due_date": "2025-01-15T18:00:00+07:00",
        "priority": "medium",
        "project": "Cá nhân"
      }
    }
  ],
  "response": "Tin nhắn thân thiện trả lời người dùng, xác nhận action"
}
`;

// Ví dụ xử lý intent
export async function processUserMessage(
  message: string,
  userId: string,
  env: Env
): Promise<AIResponse> {
  // 1. Gửi message đến Gemini để detect intent
  const intentResult = await detectIntent(message, env.GEMINI_API_KEY);

  // 2. Thực thi từng intent
  const actions = [];
  for (const intent of intentResult.intents) {
    switch (intent.type) {
      case 'CREATE_NOTE':
        actions.push(await createNote(userId, intent.entities, env.DB));
        break;
      case 'CREATE_TODO':
        actions.push(await createTodo(userId, intent.entities, env.DB));
        break;
      case 'SET_ALARM':
        actions.push(await setAlarm(userId, intent.entities, env.DB));
        break;
      case 'CREATE_SCHEDULE':
        actions.push(await createSchedule(userId, intent.entities, env.DB));
        break;
      // ... other intents
    }
  }

  // 3. Trả về response + actions đã thực hiện
  return {
    message: intentResult.response,
    actions,
    intents: intentResult.intents
  };
}
```

### 4.4 Gemini API Integration

```typescript
// === services/ai/gemini.ts ===

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiConfig {
  model?: string; // default: gemini-2.0-flash
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}

export async function callGemini(
  prompt: string,
  apiKey: string,
  config: GeminiConfig = {}
): Promise<string> {
  const model = config.model || 'gemini-2.0-flash';
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxOutputTokens ?? 2048,
      responseMimeType: 'application/json' // Force JSON output
    }
  };

  if (config.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: config.systemInstruction }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Chat với context (multi-turn)
export async function chatWithGemini(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  systemPrompt: string
): Promise<string> {
  const model = 'gemini-2.0-flash';
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    })
  });

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
```

### 4.5 MiniMax API Integration

```typescript
// === services/ai/minimax.ts ===

const MINIMAX_BASE_URL = 'https://api.minimaxi.chat/v1';

// Text-to-Speech cho voice notifications
export async function textToSpeech(
  text: string,
  apiKey: string,
  groupId: string,
  options: { voiceId?: string; speed?: number } = {}
): Promise<ArrayBuffer> {
  const response = await fetch(
    `${MINIMAX_BASE_URL}/t2a_v2?GroupId=${groupId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'speech-01-turbo',
        text,
        voice_setting: {
          voice_id: options.voiceId || 'Vietnamese_Female_Calm',
          speed: options.speed || 1.0
        },
        audio_setting: {
          format: 'mp3',
          sample_rate: 32000
        }
      })
    }
  );

  return await response.arrayBuffer();
}

// Chat completion (dùng cho các task đặc biệt MiniMax xử lý tốt hơn)
export async function minimaxChat(
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<string> {
  const response = await fetch(`${MINIMAX_BASE_URL}/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'MiniMax-Text-01',
      messages,
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
```

### 4.6 Telegram Bot

```typescript
// === services/telegram/bot.ts ===

export class TelegramBot {
  private token: string;
  private apiUrl: string;

  constructor(token: string) {
    this.token = token;
    this.apiUrl = `https://api.telegram.org/bot${token}`;
  }

  // Xử lý webhook update
  async handleUpdate(update: TelegramUpdate, env: Env): Promise<void> {
    const message = update.message;
    if (!message?.text) return;

    const chatId = message.chat.id.toString();
    const text = message.text;

    // Check if user exists, create if not
    const user = await getOrCreateUser(chatId, message.from, env.DB);

    // Check for commands
    if (text.startsWith('/')) {
      await this.handleCommand(text, chatId, user.id, env);
      return;
    }

    // Normal message → AI processing
    const aiResponse = await processUserMessage(text, user.id, env);

    // Send response
    await this.sendMessage(chatId, aiResponse.message, {
      parse_mode: 'Markdown',
      reply_markup: aiResponse.actions.length > 0
        ? this.buildActionKeyboard(aiResponse.actions)
        : undefined
    });
  }

  // Telegram Commands
  async handleCommand(text: string, chatId: string, userId: string, env: Env) {
    const [command, ...args] = text.split(' ');
    const arg = args.join(' ');

    switch (command) {
      case '/start':
        await this.sendMessage(chatId, WELCOME_MESSAGE);
        break;

      case '/note':
        // /note Ý tưởng cho app mới → tạo note nhanh
        if (arg) {
          await createQuickNote(userId, arg, env.DB);
          await this.sendMessage(chatId, `📝 Đã lưu note: "${arg}"`);
        } else {
          await this.sendMessage(chatId, 'Dùng: /note <nội dung>');
        }
        break;

      case '/todo':
        // /todo Mua sữa → tạo todo nhanh
        if (arg) {
          await createQuickTodo(userId, arg, env.DB);
          await this.sendMessage(chatId, `✅ Đã tạo todo: "${arg}"`);
        }
        break;

      case '/alarm':
        // /alarm 15:00 Họp team → set alarm
        // AI sẽ parse time từ arg
        const result = await processUserMessage(`đặt báo thức ${arg}`, userId, env);
        await this.sendMessage(chatId, result.message);
        break;

      case '/today':
        // Xem lịch hôm nay
        const summary = await getDailySummary(userId, env.DB);
        await this.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
        break;

      case '/projects':
        const projects = await listProjects(userId, env.DB);
        await this.sendMessage(chatId, formatProjectList(projects));
        break;

      case '/help':
        await this.sendMessage(chatId, HELP_MESSAGE);
        break;
    }
  }

  async sendMessage(chatId: string, text: string, options: any = {}) {
    await fetch(`${this.apiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, ...options })
    });
  }

  async sendVoice(chatId: string, audioBuffer: ArrayBuffer, caption?: string) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('voice', new Blob([audioBuffer], { type: 'audio/ogg' }), 'voice.ogg');
    if (caption) formData.append('caption', caption);

    await fetch(`${this.apiUrl}/sendVoice`, {
      method: 'POST',
      body: formData
    });
  }

  buildActionKeyboard(actions: Action[]) {
    return {
      inline_keyboard: actions.map(a => [{
        text: a.label,
        callback_data: `action:${a.id}`
      }])
    };
  }
}

const WELCOME_MESSAGE = `
🤖 *Xin chào! Mình là MOCU — trợ lý cá nhân của bạn.*

Bạn có thể nói chuyện tự nhiên với mình, ví dụ:
• "Nhắc tôi họp team lúc 3h chiều mai"
• "Tạo note: ý tưởng cho dự án mới"
• "Hôm nay tôi cần làm gì?"
• "Tạo dự án Website Redesign"

Hoặc dùng lệnh nhanh: /help để xem thêm.
`;

const HELP_MESSAGE = `
📋 *Danh sách lệnh MOCU:*

/note <nội dung> — Tạo note nhanh
/todo <công việc> — Tạo todo nhanh
/alarm <giờ> <nội dung> — Đặt báo thức
/today — Xem lịch hôm nay
/projects — Danh sách dự án
/help — Xem hướng dẫn

💡 Hoặc chat tự nhiên, mình sẽ hiểu!
`;
```

---

## 5. FRONTEND (Cloudflare Pages + React)

### 5.1 Thiết kế UI

**Phong cách:** Modern, clean, dark-first với accent color indigo. Lấy cảm hứng từ Notion + Linear.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ ☰  MOCU                          🔔  👤  ⚙️    │
├────────────┬────────────────────────────────────┤
│            │                                     │
│  📊 Tổng   │        CONTENT AREA                 │
│     quan   │                                     │
│            │  (Dashboard / Notes / Projects /    │
│  📝 Notes  │   Todos / Calendar / Chat)          │
│            │                                     │
│  📁 Dự án  │                                     │
│            │                                     │
│  ✅ Todos  │                                     │
│            │                                     │
│  ⏰ Báo    │                                     │
│     thức   │                                     │
│            │                                     │
│  📅 Lịch   │                                     │
│            │                                     │
│  💬 Chat   │                                     │
│     AI     │                                     │
│            │                                     │
├────────────┴────────────────────────────────────┤
│  🤖 Quick Chat: "Nhập lệnh hoặc hỏi MOCU..."  │
└─────────────────────────────────────────────────┘
```

---

## 6. TÍNH NĂNG CƠ BẢN (MVP)

| # | Feature | Frontend | Telegram | AI-Powered |
|---|---------|----------|----------|------------|
| 1 | Tạo/quản lý Notes | ✅ Simple editor | ✅ /note | ⚠️ Basic |
| 2 | Tạo/quản lý Todos | ✅ List view | ✅ /todo | ✅ Natural language |
| 3 | Chat AI | ✅ Chat page | ✅ Direct chat | ✅ Gemini |
| 4 | Telegram webhook | ❌ | ✅ Handler | ✅ Intent detection |
| 5 | Daily summary | ✅ Dashboard | ✅ Auto 7h AM | ✅ Tóm tắt |

---

## 7. FUTURE FEATURES (Phase 2+)

- Projects management
- Alarms & scheduling
- Voice notifications (MiniMax TTS)
- Productivity insights
- Multi-language support
