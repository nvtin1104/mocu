import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { TelegramLoginButton, type TelegramLoginData } from '../components/TelegramLoginButton'

export function LoginPage() {
  const [chatId, setChatId] = useState('')
  const { login, loginWithWidget, loading, error } = useAuth()
  const navigate = useNavigate()

  const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'mocu_assistant_bot'

  const handleTelegramAuth = async (data: TelegramLoginData) => {
    try {
      await loginWithWidget(data)
      navigate('/notes')
    } catch (err) {
      console.error('Telegram login failed:', err)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatId.trim()) return

    try {
      await login(chatId)
      navigate('/notes')
    } catch (err) {
      console.error('Manual login failed:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-card-foreground mb-2">MOCU</h1>
          <p className="text-muted-foreground mb-8">Modern-aware Curious Unique Assistant</p>

          {error && (
            <div className="bg-destructive/20 border border-destructive rounded-md p-3 mb-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Telegram Widget Login */}
            <div className="flex justify-center">
              <TelegramLoginButton
                botUsername={BOT_USERNAME}
                onAuth={handleTelegramAuth}
                buttonSize="large"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-input"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with chat ID</span>
              </div>
            </div>

            {/* Fallback: Manual Chat ID Input (for development) */}
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Chat ID
                </label>
                <input
                  type="number"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="Enter your Telegram chat ID"
                  className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Send /start to @{BOT_USERNAME} to get your ID automatically
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !chatId.trim()}
                className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
