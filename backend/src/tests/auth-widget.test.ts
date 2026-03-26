import { describe, it, expect } from 'vitest'
import app from '../index'
import { verifyTelegramLoginData, type TelegramLoginData } from '../services/telegram'
import * as crypto from 'crypto'

/**
 * Helper: Generate valid Telegram Login Widget signature
 * Following: https://core.telegram.org/widgets/login
 */
function generateTelegramWidgetHash(
  data: Omit<TelegramLoginData, 'hash'>,
  botToken: string
): string {
  // Build data_check_string (sorted fields, joined by \n)
  const dataCheckString = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  // secret_key = SHA256(bot_token)
  const secretKey = crypto.createHash('sha256').update(botToken).digest()

  // HMAC-SHA256(data_check_string, secret_key)
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  return hash
}

// Mock environment for testing
const mockEnv = {
  DB: {
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
        first: async () => {
          if (sql.includes('SELECT') && sql.includes('users')) {
            // User exists if chat_id is '123456789'
            if (args[0] === '123456789') {
              return { id: 'user-widget-123' }
            }
          }
          return null
        },
        run: async () => ({
          success: true,
          meta: { last_row_id: 'new-user-id' }
        })
      })
    })
  } as any,
  KV: {
    get: async () => null,
    put: async () => true
  } as any,
  JWT_SECRET: 'test-jwt-secret',
  TELEGRAM_BOT_TOKEN: 'test-bot-token',
  TELEGRAM_SECRET: 'test-telegram-secret',
  GEMINI_API_KEY: 'test-gemini-key',
  API_VERSION: '1.0.0',
  LOG_LEVEL: 'info',
  TELEGRAM_BOT_USERNAME: 'test_bot'
}

describe('POST /auth/telegram-widget', () => {
  it('should accept valid Telegram Login Widget data', async () => {
    const now = Math.floor(Date.now() / 1000)
    const baseData: Omit<TelegramLoginData, 'hash'> = {
      id: 123456789,
      first_name: 'John',
      auth_date: now
    }

    const hash = generateTelegramWidgetHash(baseData, mockEnv.TELEGRAM_BOT_TOKEN)

    const req = new Request('http://localhost/auth/telegram-widget', {
      method: 'POST',
      body: JSON.stringify({ ...baseData, hash }),
      headers: { 'Content-Type': 'application/json' }
    })

    const res = await app.fetch(req, mockEnv)
    expect(res.status).toBe(200)

    const data = await res.json() as any
    expect(data.token).toBeDefined()
    expect(data.user_id).toBeDefined()
  })

  it('should reject invalid hash', async () => {
    const now = Math.floor(Date.now() / 1000)
    const data: TelegramLoginData = {
      id: 123456789,
      first_name: 'John',
      auth_date: now,
      hash: 'invalid-hash-that-does-not-match'
    }

    const req = new Request('http://localhost/auth/telegram-widget', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    })

    const res = await app.fetch(req, mockEnv)
    expect(res.status).toBe(401)

    const resData = await res.json() as any
    expect(resData.error).toBe('Invalid Telegram data')
  })

  it('should reject data older than 24 hours', async () => {
    const tooOld = Math.floor(Date.now() / 1000) - 86401 // 24h + 1 second
    const baseData: Omit<TelegramLoginData, 'hash'> = {
      id: 123456789,
      first_name: 'John',
      auth_date: tooOld
    }

    const hash = generateTelegramWidgetHash(baseData, mockEnv.TELEGRAM_BOT_TOKEN)

    const req = new Request('http://localhost/auth/telegram-widget', {
      method: 'POST',
      body: JSON.stringify({ ...baseData, hash }),
      headers: { 'Content-Type': 'application/json' }
    })

    const res = await app.fetch(req, mockEnv)
    expect(res.status).toBe(401)
  })

  it('should create new user if not exists', async () => {
    const now = Math.floor(Date.now() / 1000)
    const baseData: Omit<TelegramLoginData, 'hash'> = {
      id: 987654321, // Different ID, user won't exist
      first_name: 'Jane',
      auth_date: now
    }

    const hash = generateTelegramWidgetHash(baseData, mockEnv.TELEGRAM_BOT_TOKEN)

    // Mock that returns nothing on first SELECT (user not found), then returns new user on second
    const envNewUser = {
      ...mockEnv,
      DB: {
        prepare: (sql: string) => ({
          bind: (...args: any[]) => ({
            first: async () => {
              // After INSERT, second SELECT should return new user
              if (sql.includes('SELECT') && args[0] === '987654321') {
                return { id: 'new-user-987' }
              }
              return null
            },
            run: async () => ({
              success: true,
              meta: { last_row_id: 'new-user-987' }
            })
          })
        })
      }
    }

    const req = new Request('http://localhost/auth/telegram-widget', {
      method: 'POST',
      body: JSON.stringify({ ...baseData, hash }),
      headers: { 'Content-Type': 'application/json' }
    })

    const res = await app.fetch(req, envNewUser as any)
    expect(res.status).toBe(200)

    const data = await res.json() as any
    expect(data.token).toBeDefined()
  })

  it('should accept optional fields (last_name, username, photo_url)', async () => {
    const now = Math.floor(Date.now() / 1000)
    const baseData: Omit<TelegramLoginData, 'hash'> = {
      id: 123456789,
      first_name: 'John',
      last_name: 'Doe',
      username: 'johndoe',
      photo_url: 'https://example.com/photo.jpg',
      auth_date: now
    }

    const hash = generateTelegramWidgetHash(baseData, mockEnv.TELEGRAM_BOT_TOKEN)

    const req = new Request('http://localhost/auth/telegram-widget', {
      method: 'POST',
      body: JSON.stringify({ ...baseData, hash }),
      headers: { 'Content-Type': 'application/json' }
    })

    const res = await app.fetch(req, mockEnv)
    expect(res.status).toBe(200)
  })

  it('should validate all required fields', async () => {
    const invalidData = {
      // Missing id and other fields
      first_name: 'John'
    }

    const req = new Request('http://localhost/auth/telegram-widget', {
      method: 'POST',
      body: JSON.stringify(invalidData),
      headers: { 'Content-Type': 'application/json' }
    })

    const res = await app.fetch(req, mockEnv)
    expect(res.status).toBe(400)
  })

  it('should rate limit after 10 attempts', async () => {
    const now = Math.floor(Date.now() / 1000)
    const baseData: Omit<TelegramLoginData, 'hash'> = {
      id: 123456789,
      first_name: 'John',
      auth_date: now
    }
    const hash = generateTelegramWidgetHash(baseData, mockEnv.TELEGRAM_BOT_TOKEN)

    // Mock KV that tracks rate limit
    const envRateLimit = {
      ...mockEnv,
      KV: {
        get: async (key: string) => {
          if (key.includes('ratelimit:auth:123456789')) {
            return '10' // Already at limit
          }
          return null
        },
        put: async () => true
      }
    }

    const req = new Request('http://localhost/auth/telegram-widget', {
      method: 'POST',
      body: JSON.stringify({ ...baseData, hash }),
      headers: { 'Content-Type': 'application/json' }
    })

    const res = await app.fetch(req, envRateLimit as any)
    expect(res.status).toBe(429)

    const data = await res.json() as any
    expect(data.error).toContain('Too many login attempts')
  })
})

describe('verifyTelegramLoginData utility function', () => {
  it('should verify valid signature', async () => {
    const now = Math.floor(Date.now() / 1000)
    const baseData: Omit<TelegramLoginData, 'hash'> = {
      id: 123456789,
      first_name: 'John',
      auth_date: now
    }
    const hash = generateTelegramWidgetHash(baseData, 'test-bot-token')
    const data: TelegramLoginData = { ...baseData, hash }

    const isValid = await verifyTelegramLoginData(data, 'test-bot-token')
    expect(isValid).toBe(true)
  })

  it('should reject invalid signature', async () => {
    const now = Math.floor(Date.now() / 1000)
    const data: TelegramLoginData = {
      id: 123456789,
      first_name: 'John',
      auth_date: now,
      hash: 'completely-wrong-hash'
    }

    const isValid = await verifyTelegramLoginData(data, 'test-bot-token')
    expect(isValid).toBe(false)
  })

  it('should reject old auth_date', async () => {
    const tooOld = Math.floor(Date.now() / 1000) - 100000 // Way older than 24h
    const baseData: Omit<TelegramLoginData, 'hash'> = {
      id: 123456789,
      first_name: 'John',
      auth_date: tooOld
    }
    const hash = generateTelegramWidgetHash(baseData, 'test-bot-token')
    const data: TelegramLoginData = { ...baseData, hash }

    const isValid = await verifyTelegramLoginData(data, 'test-bot-token')
    expect(isValid).toBe(false)
  })
})
