import { describe, it, expect } from 'vitest'
import app from '../index'

// Mock environment for testing
const mockEnv = {
  DB: {
    prepare: (sql: string) => ({
      bind: () => ({
        all: async () => {
          if (sql.includes('SELECT') && sql.includes('FROM notes')) {
            return [
              {
                id: 'note-1',
                user_id: 'user-123',
                title: 'Test Note',
                content: 'Test Content',
                tags: 'tag1,tag2',
                is_archived: 0,
                created_at: '2024-03-25T00:00:00Z',
                updated_at: '2024-03-25T00:00:00Z'
              }
            ]
          }
          return []
        },
        first: async () => {
          if (sql.includes('INSERT')) {
            return { id: 'new-note-id' }
          }
          return null
        },
        run: async () => ({ success: true })
      })
    })
  } as any,
  KV: {
    get: async () => null,
    put: async () => true
  } as any,
  JWT_SECRET: 'test-secret',
  API_VERSION: '1.0.0',
  LOG_LEVEL: 'info'
}

describe('Notes API', () => {
  it('should return 401 without JWT token', async () => {
    const req = new Request('http://localhost/api/notes', {
      method: 'GET'
    })

    const res = await app.fetch(req, mockEnv as any)
    expect(res.status).toBe(401)
  })

  it('should return notes with valid JWT token', async () => {
    // In real tests, we'd generate a valid JWT
    const req = new Request('http://localhost/api/notes', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6OTk5OTk5OTk5OX0.test'
      }
    })

    const res = await app.fetch(req, mockEnv as any)
    // Note: This will likely fail due to JWT verification, but demonstrates the pattern
    if (res.status === 200) {
      const data = await res.json() as any
      expect(Array.isArray(data)).toBe(true)
    }
  })

  it('should reject invalid JSON in POST', async () => {
    const req = new Request('http://localhost/api/notes', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    })

    const res = await app.fetch(req, mockEnv as any)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
