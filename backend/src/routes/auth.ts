import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sign } from 'hono/jwt'
import { Env, LoginResponse } from '../types'
import { verifyTelegramLoginData, type TelegramLoginData } from '../services/telegram'

const authRouter = new Hono<{ Bindings: Env }>()

const LoginSchema = z.object({
  chat_id: z.string().min(1, 'Chat ID required')
})

const TelegramWidgetSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string()
})

// POST /auth/telegram - Login with Telegram chat ID
authRouter.post('/telegram', zValidator('json', LoginSchema), async (c) => {
  const { chat_id } = c.req.valid('json')

  try {
    // Rate limiting: max 10 login attempts per hour per chat_id
    const rateLimitKey = `ratelimit:auth:${chat_id}`
    const attemptsStr = await c.env.KV.get(rateLimitKey)
    const attempts = Number(attemptsStr || 0)

    if (attempts >= 10) {
      return c.json({ error: 'Too many login attempts. Try again in 1 hour' }, 429)
    }

    // Increment attempts
    await c.env.KV.put(
      rateLimitKey,
      String(attempts + 1),
      { expirationTtl: 3600 } // 1 hour TTL
    )
    // Check if user exists and get by chat_id
    let user = await c.env.DB
      .prepare('SELECT id FROM users WHERE telegram_chat_id = ?')
      .bind(chat_id)
      .first<{ id: string }>()

    // Create user if doesn't exist
    if (!user) {
      await c.env.DB
        .prepare('INSERT INTO users (telegram_chat_id) VALUES (?)')
        .bind(chat_id)
        .run()

      // Query the user back to get the generated ID
      user = await c.env.DB
        .prepare('SELECT id FROM users WHERE telegram_chat_id = ?')
        .bind(chat_id)
        .first<{ id: string }>()

      if (!user) {
        throw new Error('Failed to create user')
      }
    }

    // Generate JWT token (valid for 24 hours)
    const exp = Math.floor(Date.now() / 1000) + 86400

    const token = await sign(
      {
        sub: user.id,  // Use database user ID, not chat_id
        chat_id: chat_id,  // Store chat_id as well if needed
        exp
      },
      c.env.JWT_SECRET
    )

    const response: LoginResponse = {
      token,
      user_id: user.id
    }

    return c.json(response, 200)
  } catch (err) {
    console.error('POST /auth/telegram error:', err)
    return c.json({ error: 'Authentication failed' }, 500)
  }
})

// POST /auth/telegram-widget - Login with Telegram Widget (verified via HMAC)
authRouter.post('/telegram-widget', zValidator('json', TelegramWidgetSchema), async (c) => {
  const data = c.req.valid('json') as TelegramLoginData

  try {
    // Verify signature from Telegram (prevents forgery)
    const isValid = await verifyTelegramLoginData(data, c.env.TELEGRAM_BOT_TOKEN)
    if (!isValid) {
      return c.json({ error: 'Invalid Telegram data' }, 401)
    }

    const chat_id = data.id.toString()

    // Rate limiting: max 10 login attempts per hour per user
    const rateLimitKey = `ratelimit:auth:${chat_id}`
    const attemptsStr = await c.env.KV.get(rateLimitKey)
    const attempts = Number(attemptsStr || 0)

    if (attempts >= 10) {
      return c.json({ error: 'Too many login attempts. Try again in 1 hour' }, 429)
    }

    await c.env.KV.put(
      rateLimitKey,
      String(attempts + 1),
      { expirationTtl: 3600 } // 1 hour TTL
    )

    // Check if user exists by chat_id
    let user = await c.env.DB
      .prepare('SELECT id FROM users WHERE telegram_chat_id = ?')
      .bind(chat_id)
      .first<{ id: string }>()

    // Create user if doesn't exist
    if (!user) {
      await c.env.DB
        .prepare('INSERT INTO users (telegram_chat_id) VALUES (?)')
        .bind(chat_id)
        .run()

      user = await c.env.DB
        .prepare('SELECT id FROM users WHERE telegram_chat_id = ?')
        .bind(chat_id)
        .first<{ id: string }>()

      if (!user) {
        throw new Error('Failed to create user')
      }
    }

    // Generate JWT token (valid for 24 hours)
    const exp = Math.floor(Date.now() / 1000) + 86400

    const token = await sign(
      {
        sub: user.id,
        chat_id: chat_id,
        exp
      },
      c.env.JWT_SECRET
    )

    const response: LoginResponse = {
      token,
      user_id: user.id
    }

    return c.json(response, 200)
  } catch (err) {
    console.error('POST /auth/telegram-widget error:', err)
    return c.json({ error: 'Authentication failed' }, 500)
  }
})

export default authRouter
