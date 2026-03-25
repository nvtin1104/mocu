/**
 * API Client for MOCU Backend
 * Handles authentication and API communication
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8788'

export interface ApiClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, data?: unknown): Promise<T>
  put<T>(path: string, data?: unknown): Promise<T>
  patch<T>(path: string, data?: unknown): Promise<T>
  delete<T>(path: string): Promise<T>
}

export function createApiClient(token?: string | null): ApiClient {
  const headers = (additional = {}) => ({
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...additional
  })

  const handleResponse = async <T>(res: Response): Promise<T> => {
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(error.error || `HTTP ${res.status}`)
    }
    return res.json()
  }

  return {
    async get<T>(path: string): Promise<T> {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: headers()
      })
      return handleResponse<T>(res)
    },

    async post<T>(path: string, data?: unknown): Promise<T> {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: headers(),
        body: data ? JSON.stringify(data) : undefined
      })
      return handleResponse<T>(res)
    },

    async put<T>(path: string, data?: unknown): Promise<T> {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'PUT',
        headers: headers(),
        body: data ? JSON.stringify(data) : undefined
      })
      return handleResponse<T>(res)
    },

    async patch<T>(path: string, data?: unknown): Promise<T> {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'PATCH',
        headers: headers(),
        body: data ? JSON.stringify(data) : undefined
      })
      return handleResponse<T>(res)
    },

    async delete<T>(path: string): Promise<T> {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        headers: headers()
      })
      return handleResponse<T>(res)
    }
  }
}
