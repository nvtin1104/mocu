# Phase 2: Telegram Bot + Gemini Intent Detection

**Duration:** Days 4-9 | **Dependencies:** Phase 1 API | **Parallel:** Phase 3

## Overview

Implement Telegram bot webhook receiver with HMAC verification, command handlers, and Gemini API for natural language intent detection. Bot will create notes/todos via chat and respond with confirmations.

**Deliverables:**
- ✅ Telegram webhook endpoint with security verification
- ✅ Command handlers (/note, /todo, /help, /today)
- ✅ Gemini intent detection with JSON Schema
- ✅ Database action execution (create note, create todo)
- ✅ Rate limiting + audit logging

## Context & Key Insights

**From Research:**
- Telegram uses HMAC-SHA256 signature validation (critical for security)
- Gemini 2.5+ native JSON Schema support for structured outputs
- Must use constant-time comparison for HMAC (timing attack prevention)
- Reply within 5-10 seconds to Telegram (request timeout)
- Message idempotency handling for retries
- Free tier: 15 req/min (Gemini), must handle quota limits gracefully

## Requirements

### Telegram Bot Setup
- Bot token from @BotFather
- Random SECRET for webhook verification (1-256 chars)
- Webhook URL: `https://mocu-api.workers.dev/api/telegram/webhook`
- HTTPS enforcement (Telegram requirement)

### Gemini API
- API key with free/paid tier access
- JSON Schema structured outputs (2.5+ models)
- System prompt in Vietnamese
- Intent types: CREATE_NOTE, CREATE_TODO, QUERY_TODOS, UPDATE_TODO, DELETE_TODO, HELP

### Database Integration
- Link Telegram chat_id to user (from Phase 1 auth)
- Store message logs for audit trail
- Track action results (success/failure)

## Architecture

```
Telegram User
    ↓ (POST /webhook + signature)
CF Worker (verify HMAC-SHA256)
    ↓ (constant-time comparison)
Check rate limit (KV bucket)
    ↓
Route: /command or AI intent?
    ├─→ /command: Direct handler
    │   └─→ Create note/todo quickly
    │
    └─→ AI intent: Send to Gemini
        ├─→ JSON Schema validation
        ├─→ Parse intent + parameters
        └─→ Execute action in DB
            ↓
        Generate response message
            ↓
        Telegram sendMessage API
            ↓
        Log audit trail (KV)
```

## Implementation Steps

### Step 1: Extend Phase 1 wrangler.toml

Add to `wrangler.toml`:
```toml
[vars]
TELEGRAM_BOT_USERNAME = "mocu_assistant_bot"

# Secrets (wrangler secret put):
# TELEGRAM_BOT_TOKEN
# TELEGRAM_SECRET
# GEMINI_API_KEY
```

### Step 2: Create Telegram Service Layer (Day 4)

File: `src/services/telegram.ts`
```typescript
import { HexColorCodec } from 'crypto'

export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const crypto = await import('crypto')
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const hash = hmac.digest('hex')

  // Constant-time comparison (timing attack prevention)
  const expected = Buffer.from(hash)
  const actual = Buffer.from(signature)

  if (expected.length !== actual.length) return false
  return crypto.timingSafeEqual(expected, actual)
}

export interface TelegramMessage {
  chat: { id: number; username?: string }
  text: string
  message_id: number
  from: { id: number; first_name: string }
}

export interface TelegramUpdate {
  update_id: number
  message: TelegramMessage
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  token: string
) {
  const response = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    })
  })
  return await response.json()
}
```

### Step 3: Implement Gemini Intent Detection (Day 5)

File: `src/services/gemini.ts`
```typescript
interface GeminiSchema {
  intent: string
  parameters: Record<string, unknown>
  confidence: number
}

const INTENT_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      enum: ['CREATE_NOTE', 'CREATE_TODO', 'QUERY_TODOS', 'UPDATE_TODO', 'DELETE_TODO', 'HELP']
    },
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        todo_id: { type: 'string' },
        status: { enum: ['pending', 'in_progress', 'done'] }
      }
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 }
  },
  required: ['intent', 'parameters', 'confidence']
}

export async function detectIntent(
  message: string,
  apiKey: string
): Promise<GeminiSchema> {
  const systemPrompt = `Bạn là MOCU, trợ lý AI. Phân tích tin nhắn Việt và trả về JSON.
Intents: CREATE_NOTE (lưu ý), CREATE_TODO (công việc), QUERY_TODOS (xem todo), UPDATE_TODO (sửa), DELETE_TODO (xóa), HELP (trợ giúp).
Luôn trả về JSON hợp lệ, không giải thích.`

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: message }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 256,
          responseMimeType: 'application/json',
          responseSchema: INTENT_SCHEMA
        }
      })
    }
  )

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  return JSON.parse(text)
}

// Fallback simple keyword matching
export function fallbackIntent(message: string): GeminiSchema {
  if (message.match(/^\/help/i)) {
    return { intent: 'HELP', parameters: {}, confidence: 1.0 }
  }
  if (message.match(/^\/note\s+(.+)/i)) {
    const match = message.match(/^\/note\s+(.+)/)
    return {
      intent: 'CREATE_NOTE',
      parameters: { title: match?.[1] },
      confidence: 1.0
    }
  }
  if (message.match(/^\/todo\s+(.+)/i)) {
    const match = message.match(/^\/todo\s+(.+)/)
    return {
      intent: 'CREATE_TODO',
      parameters: { title: match?.[1] },
      confidence: 1.0
    }
  }
  return { intent: 'HELP', parameters: {}, confidence: 0.5 }
}
```

### Step 4: Add Webhook Handler to Phase 1 index.ts (Day 5-6)

```typescript
import { verifyWebhookSignature, sendTelegramMessage } from './services/telegram'
import { detectIntent, fallbackIntent } from './services/gemini'

// Webhook endpoint
app.post('/api/telegram/webhook', async (c) => {
  const signature = c.req.header('X-Telegram-Bot-Api-Secret-Token')
  const body = await c.req.text()

  // Verify signature
  if (!await verifyWebhookSignature(body, signature!, c.env.TELEGRAM_SECRET)) {
    return c.json({ error: 'Invalid signature' }, 403)
  }

  const update = JSON.parse(body)
  const message = update.message

  if (!message?.text) return c.json({ ok: true })

  const chatId = message.chat.id
  const userId = message.from.id
  const text = message.text

  try {
    // Rate limit check (20 msgs/hour per user)
    const rateLimitKey = `ratelimit:${userId}`
    const quota = JSON.parse(await c.env.KV.get(rateLimitKey) || '{"count":0,"reset":0}')

    if (quota.reset < Date.now()) {
      quota.count = 0
      quota.reset = Date.now() + 3600000
    }

    if (quota.count >= 20) {
      await sendTelegramMessage(chatId, '⚠️ Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau.', c.env.TELEGRAM_BOT_TOKEN)
      return c.json({ ok: true })
    }

    quota.count++
    await c.env.KV.put(rateLimitKey, JSON.stringify(quota), { expirationTtl: 3600 })

    // Get or create user
    let user = await c.env.DB
      .prepare('SELECT id FROM users WHERE telegram_chat_id = ?')
      .bind(userId.toString())
      .first()

    if (!user) {
      const result = await c.env.DB
        .prepare('INSERT INTO users (telegram_chat_id) VALUES (?)')
        .bind(userId.toString())
        .run()
      user = { id: result.meta.last_row_id }
    }

    // Detect intent
    let intent
    try {
      intent = await detectIntent(text, c.env.GEMINI_API_KEY)
    } catch (err) {
      console.error('Gemini error:', err)
      intent = fallbackIntent(text)
    }

    // Log message
    await c.env.KV.put(
      `msg:${chatId}:${message.message_id}`,
      JSON.stringify({ text, intent, timestamp: Date.now() }),
      { expirationTtl: 2592000 } // 30 days
    )

    // Execute intent
    let response = ''
    switch (intent.intent) {
      case 'CREATE_NOTE': {
        const title = intent.parameters.title || 'Untitled'
        const content = intent.parameters.content || ''
        await c.env.DB
          .prepare('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)')
          .bind(user.id, title, content)
          .run()
        response = `📝 Đã lưu note: "${title}"`
        break
      }

      case 'CREATE_TODO': {
        const title = intent.parameters.title || 'Untitled'
        await c.env.DB
          .prepare('INSERT INTO todos (user_id, title) VALUES (?, ?)')
          .bind(user.id, title)
          .run()
        response = `✅ Đã tạo todo: "${title}"`
        break
      }

      case 'QUERY_TODOS': {
        const todos = await c.env.DB
          .prepare('SELECT * FROM todos WHERE user_id = ? AND status != "done" ORDER BY created_at DESC LIMIT 5')
          .bind(user.id)
          .all()
        if (todos.results.length === 0) {
          response = '✨ Không có todo nào. Bạn rảnh quá!'
        } else {
          response = '📋 Danh sách todo:\n' + todos.results
            .map((t: any) => `• ${t.title} [${t.priority}]`)
            .join('\n')
        }
        break
      }

      case 'HELP':
      default: {
        response = `🤖 *MOCU — Trợ lý cá nhân*\n\n📝 /note <nội dung> — Tạo note\n✅ /todo <việc> — Tạo todo\n📋 /todos — Xem todo\n💬 Hoặc chat tự nhiên!`
        break
      }
    }

    await sendTelegramMessage(chatId, response, c.env.TELEGRAM_BOT_TOKEN)

  } catch (err) {
    console.error('Webhook error:', err)
    await sendTelegramMessage(
      chatId,
      '❌ Lỗi xử lý. Vui lòng thử lại.',
      c.env.TELEGRAM_BOT_TOKEN
    )
  }

  return c.json({ ok: true })
})

// Setup webhook endpoint
app.post('/api/telegram/set-webhook', async (c) => {
  const webhookUrl = await c.req.json().then(b => b.url)

  const response = await fetch(
    'https://api.telegram.org/bot' + c.env.TELEGRAM_BOT_TOKEN + '/setWebhook',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: c.env.TELEGRAM_SECRET,
        allowed_updates: ['message']
      })
    }
  )

  return c.json(await response.json())
})
```

### Step 5: Deploy & Register Webhook (Day 6)

```bash
# Deploy updated worker
wrangler deploy

# Register webhook
curl https://mocu-api.YOUR-SUBDOMAIN.workers.dev/api/telegram/set-webhook \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url":"https://mocu-api.YOUR-SUBDOMAIN.workers.dev/api/telegram/webhook"}'

# Test with Telegram bot
# Send message to @mocu_assistant_bot in Telegram
```

## Todo List

- [ ] Create Telegram bot with @BotFather
- [ ] Store bot token & secret in wrangler secrets
- [ ] Implement webhook signature verification
- [ ] Test HMAC-SHA256 verification locally
- [ ] Create Gemini intent detection service
- [ ] Test Gemini JSON schema responses
- [ ] Implement command handlers (/note, /todo, /help)
- [ ] Add rate limiting logic
- [ ] Create audit logging to KV
- [ ] Link Telegram user to DB user
- [ ] Deploy webhook
- [ ] Register webhook URL
- [ ] Test end-to-end with Telegram bot

## Success Criteria

- [ ] Webhook signature verification blocks invalid requests
- [ ] Messages within 5-10 seconds receive responses
- [ ] /note command creates note in database
- [ ] /todo command creates todo in database
- [ ] /todos lists pending todos
- [ ] Rate limiting prevents abuse (20 msgs/hour)
- [ ] Gemini timeout gracefully falls back to keyword matching
- [ ] Audit log captures all message intents
- [ ] Telegram bot replies with confirmation messages

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Gemini quota (15 req/min) | High | Implement queue + fallback |
| Telegram timeout (5-10s) | Medium | Use async background jobs |
| Message idempotency | Medium | Track message_id in KV |
| HMAC timing attacks | High | Use constant-time comparison |
| Intent parsing failure | Medium | Fallback keyword matching |

## Security Considerations

- ✅ HMAC-SHA256 constant-time verification
- ✅ Secrets via `wrangler secret put`
- ✅ Rate limiting per-user (20 msgs/hour)
- ✅ Audit logging with 30-day retention
- ✅ User ID validation on all DB operations
- ⚠️ No OTP verification (defer to Phase 4 if needed)

## Unresolved Questions (from research)

1. Vietnamese dialectal variations: How well does Gemini handle Southern vs Northern?
2. Message retry handling: How to prevent duplicate processing?
3. Gemini quota failover: Queue messages or simple "try again" response?
4. Concurrent message handling: Durable Objects for transaction support?
5. Per-chat vs global rate limits: Need product decision.

## Next Steps

→ **Phase 3:** React frontend (run in parallel)
→ **Phase 4:** E2E testing + production deployment
