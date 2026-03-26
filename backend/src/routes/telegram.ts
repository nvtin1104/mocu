import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Env } from '../types'
import {
  verifyTelegramSignature,
  parseTelegramUpdate,
  sendTelegramMessage,
  type TelegramUpdate
} from '../services/telegram'
import { detectIntent } from '../services/gemini'

const telegramRouter = new Hono<{ Bindings: Env }>()

// Request validation schemas
const SetWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL')
})

/**
 * POST /api/telegram/webhook
 * Receive and process Telegram updates
 */
telegramRouter.post('/webhook', async (c) => {
  // Get signature from headers
  const signature = c.req.header('X-Telegram-Bot-Api-Secret-Token')

  if (!signature) {
    console.warn('Missing Telegram signature')
    return c.json({ error: 'Missing signature' }, 403)
  }

  // Get raw body for signature verification
  const body = await c.req.text()

  // Verify webhook signature
  const isValid = await verifyTelegramSignature(body, signature, c.env.TELEGRAM_SECRET)

  if (!isValid) {
    console.warn('Invalid Telegram signature')
    return c.json({ error: 'Invalid signature' }, 403)
  }

  // Parse update
  let update: TelegramUpdate
  try {
    update = JSON.parse(body)
  } catch (err) {
    console.error('Failed to parse Telegram update:', err)
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  // Extract message
  const parsedMsg = parseTelegramUpdate(update)

  if (!parsedMsg) {
    // Not a text message, just acknowledge
    return c.json({ ok: true })
  }

  const { chat_id, text, from_id } = parsedMsg

  try {
    // Rate limiting check (20 messages/hour per user)
    const rateLimitKey = `ratelimit:tg:${from_id}`
    const quotaJson = await c.env.KV.get(rateLimitKey)
    const quota = quotaJson ? (JSON.parse(quotaJson) as any) : { count: 0, reset: 0 }

    if (quota.reset < Date.now()) {
      quota.count = 0
      quota.reset = Date.now() + 3600000 // 1 hour
    }

    if (quota.count >= 20) {
      await sendTelegramMessage(
        chat_id,
        '⚠️ Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau.',
        c.env.TELEGRAM_BOT_TOKEN
      )
      return c.json({ ok: true })
    }

    quota.count++
    await c.env.KV.put(rateLimitKey, JSON.stringify(quota), {
      expirationTtl: 3600
    })

    // Get or create user
    let user = await c.env.DB
      .prepare('SELECT id FROM users WHERE telegram_chat_id = ?')
      .bind(from_id.toString())
      .first<{ id: string }>()

    if (!user) {
      await c.env.DB
        .prepare('INSERT INTO users (telegram_chat_id) VALUES (?)')
        .bind(from_id.toString())
        .run()

      user = await c.env.DB
        .prepare('SELECT id FROM users WHERE telegram_chat_id = ?')
        .bind(from_id.toString())
        .first<{ id: string }>()

      if (!user) {
        throw new Error('Failed to create user')
      }
    }

    const userId = user.id

    // Handle commands (fast path)
    if (text.startsWith('/')) {
      const response = await handleCommand(text, userId, c.env)
      await sendTelegramMessage(chat_id, response, c.env.TELEGRAM_BOT_TOKEN, {
        parse_mode: 'Markdown'
      })
      return c.json({ ok: true })
    }

    // Use Gemini to detect intent
    let intent = await detectIntent(text, c.env.GEMINI_API_KEY)

    // Log message and intent
    await c.env.KV.put(
      `msg:tg:${chat_id}:${update.update_id}`,
      JSON.stringify({
        text,
        intent: intent.intent,
        confidence: intent.confidence,
        timestamp: Date.now()
      }),
      { expirationTtl: 2592000 } // 30 days
    )

    // Execute action based on intent
    let responseMsg = ''

    switch (intent.intent) {
      case 'CREATE_NOTE': {
        const title = (intent.parameters.title as string) || 'Untitled'
        const content = (intent.parameters.content as string) || ''

        await c.env.DB
          .prepare('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)')
          .bind(userId, title, content)
          .run()

        responseMsg = `📝 Đã lưu note: "${title}"`
        break
      }

      case 'CREATE_TODO': {
        const title = (intent.parameters.title as string) || 'Untitled'
        const priority = (intent.parameters.priority as string) || 'medium'

        await c.env.DB
          .prepare('INSERT INTO todos (user_id, title, priority) VALUES (?, ?, ?)')
          .bind(userId, title, priority)
          .run()

        responseMsg = `✅ Tạo todo: "${title}"`
        break
      }

      case 'QUERY_TODOS': {
        const todos = await c.env.DB
          .prepare(
            'SELECT * FROM todos WHERE user_id = ? AND status != "done" ORDER BY priority DESC, created_at DESC LIMIT 10'
          )
          .bind(userId)
          .all()

        if (todos.results && todos.results.length > 0) {
          const todoList = (todos.results as any[])
            .map((t) => `• ${t.title} [${t.priority}]`)
            .join('\n')
          responseMsg = `📋 Danh sách todo:\n${todoList}`
        } else {
          responseMsg = '✨ Không có todo nào. Bạn rảnh quá!'
        }
        break
      }

      case 'HELP':
      default: {
        responseMsg = `🤖 *MOCU — Trợ lý cá nhân*\n\n📝 /note <nội dung> — Tạo ghi chú\n✅ /todo <việc> — Tạo công việc\n📋 /todos — Xem todo\n💬 Hoặc chat tự nhiên!`
        break
      }
    }

    await sendTelegramMessage(chat_id, responseMsg, c.env.TELEGRAM_BOT_TOKEN, {
      parse_mode: 'Markdown'
    })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    await sendTelegramMessage(
      chat_id,
      '❌ Có lỗi xảy ra. Vui lòng thử lại.',
      c.env.TELEGRAM_BOT_TOKEN
    )
  }

  return c.json({ ok: true })
})

/**
 * Handle telegram commands (fast path, before Gemini)
 */
async function handleCommand(text: string, userId: string, env: Env): Promise<string> {
  const [command, ...args] = text.split(' ')
  const arg = args.join(' ')

  switch (command) {
    case '/start':
      return `🤖 *Xin chào!* Mình là MOCU, trợ lý cá nhân của bạn.\n\nBạn có thể:\n• Nói chuyện tự nhiên\n• Dùng lệnh /note, /todo, /help\n• Hỏi "hôm nay làm gì?"`

    case '/note':
      if (arg) {
        await env.DB
          .prepare('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)')
          .bind(userId, arg, '')
          .run()
        return `📝 Đã lưu note: "${arg}"`
      }
      return 'Dùng: /note <nội dung>'

    case '/todo':
      if (arg) {
        await env.DB
          .prepare('INSERT INTO todos (user_id, title) VALUES (?, ?)')
          .bind(userId, arg)
          .run()
        return `✅ Tạo todo: "${arg}"`
      }
      return 'Dùng: /todo <công việc>'

    case '/todos': {
      const todos = await env.DB
        .prepare('SELECT * FROM todos WHERE user_id = ? AND status = ? ORDER BY created_at DESC')
        .bind(userId, 'pending')
        .all()

      if (todos.results && todos.results.length > 0) {
        const list = (todos.results as any[])
          .map((t) => `• ${t.title}`)
          .join('\n')
        return `📋 Công việc cần làm:\n${list}`
      }
      return '✨ Không có todo nào!'
    }

    case '/help':
      return `📚 *Hướng dẫn MOCU*\n\n/start — Giới thiệu\n/note <nội dung> — Tạo ghi chú\n/todo <việc> — Tạo công việc\n/todos — Xem danh sách\n/help — Hướng dẫn này\n\n💡 Hoặc chat tự nhiên!`

    default:
      return `❓ Lệnh không biết: ${command}. Dùng /help để xem hướng dẫn.`
  }
}

/**
 * POST /api/telegram/set-webhook
 * Register webhook URL with Telegram
 */
telegramRouter.post('/set-webhook', zValidator('json', SetWebhookSchema), async (c) => {
  const { url } = c.req.valid('json')

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          secret_token: c.env.TELEGRAM_SECRET,
          allowed_updates: ['message']
        })
      }
    )

    const result = await response.json()

    if (!response.ok) {
      return c.json(
        { error: 'Failed to set webhook', details: result },
        response.status as any
      )
    }

    return c.json({ success: true, webhook_url: url })
  } catch (err) {
    console.error('Set webhook error:', err)
    return c.json(
      { error: 'Failed to set webhook', details: String(err) },
      500
    )
  }
})

export default telegramRouter
