import { useState } from 'react'
import { createApiClient } from '../lib/api'
import type { TelegramLoginData } from '../components/TelegramLoginButton'

export function useAuth() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('mocu_token')
  )
  const [userId, setUserId] = useState<string | null>(() =>
    localStorage.getItem('mocu_user_id')
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (chatId: string) => {
    setLoading(true)
    setError(null)
    try {
      const client = createApiClient()
      const res = await client.post<{ token: string; user_id: string }>(
        '/auth/telegram',
        { chat_id: chatId }
      )

      setToken(res.token)
      setUserId(res.user_id)
      localStorage.setItem('mocu_token', res.token)
      localStorage.setItem('mocu_user_id', res.user_id)
      localStorage.setItem('mocu_chat_id', chatId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const loginWithWidget = async (data: TelegramLoginData) => {
    setLoading(true)
    setError(null)
    try {
      const client = createApiClient()
      const res = await client.post<{ token: string; user_id: string }>(
        '/auth/telegram-widget',
        data
      )

      setToken(res.token)
      setUserId(res.user_id)
      localStorage.setItem('mocu_token', res.token)
      localStorage.setItem('mocu_user_id', res.user_id)
      localStorage.setItem('mocu_chat_id', data.id.toString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUserId(null)
    localStorage.removeItem('mocu_token')
    localStorage.removeItem('mocu_user_id')
    localStorage.removeItem('mocu_chat_id')
  }

  return {
    token,
    userId,
    loading,
    error,
    login,
    loginWithWidget,
    logout,
    isAuthenticated: !!token
  }
}
