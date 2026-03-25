import { describe, it, expect } from 'vitest'
import app from '../index'

// Mock environment for testing
const mockEnv = {
  DB: {
    prepare: (sql: string) => ({
      bind: (value: string) => ({
        first: async () => {
          if (sql.includes('SELECT') && value === 'test-chat-id') {
            return { id: 'test-user-id' }
          }
          return null
        },
        run: async () => ({ success: true })
      })
    })
  } as any,
  KV: {
    get: async (key: string) => {
      if (key.includes('ratelimit:auth:test-chat-id')) {
        return '0'
      }
      return null
    },
    put: async () => true
  } as any,
  JWT_SECRET: 'test-secret',
  TELEGRAM_BOT_TOKEN: 'test-token',
  TELEGRAM_SECRET: 'test-secret',
  GEMINI_API_KEY: 'test-key',
  API_VERSION: '1.0.0',
  LOG_LEVEL: 'info'
}

describe('POST /auth/telegram', () => {
  it('should return JWT token on successful login', async () => {
    const req = new Request('http://localhost/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ chat_id: 'test-chat-id' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const res = await app.fetch(req, mockEnv)
    const data = await res.json() as any

    expect(res.status).toBe(200)
    expect(data.token).toBeDefined()
    expect(data.user_id).toBe('test-user-id')
  })

  it('should validate chat_id is required', async () => {
    const req = new Request('http://localhost/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ chat_id: '' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const res = await app.fetch(req, mockEnv)
    expect(res.status).toBe(400)
  })

  it('should return 429 when rate limit exceeded', async () => {
    const envWithRateLimit = {
      ...mockEnv,
      KV: {
        ...mockEnv.KV,
        get: async (key: string) => {
          if (key.includes('ratelimit:auth')) {
            return '10' // Already at limit
          }
          return null
        }
      }
    }

    const req = new Request('http://localhost/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ chat_id: 'test-chat-id' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const res = await app.fetch(req, envWithRateLimit as any)
    expect(res.status).toBe(429)
    const data = await res.json() as any
    expect(data.error).toContain('Too many login attempts')
  })
})
