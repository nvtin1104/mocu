import { useEffect, useRef } from 'react'

/**
 * Telegram Login Widget data
 * Sent by Telegram when user authorizes via widget
 */
export interface TelegramLoginData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface Props {
  botUsername: string
  onAuth: (data: TelegramLoginData) => void | Promise<void>
  buttonSize?: 'large' | 'medium' | 'small'
}

/**
 * TelegramLoginButton
 *
 * Injects the official Telegram Login Widget script
 * User authorizes via Telegram popup, widget calls onAuth callback
 *
 * Note: Widget only works on HTTPS domains registered with @BotFather
 * Use /setdomain command with your bot to register domain
 */
export function TelegramLoginButton({ botUsername, onAuth, buttonSize = 'large' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Register global callback for Telegram widget
    (window as any).onTelegramAuth = async (user: TelegramLoginData) => {
      try {
        await onAuth(user)
      } catch (err) {
        console.error('Telegram login callback error:', err)
      }
    }

    // Inject Telegram widget script
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', buttonSize)
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true

    containerRef.current?.appendChild(script)

    // Cleanup
    return () => {
      delete (window as any).onTelegramAuth
      containerRef.current?.replaceChildren()
    }
  }, [botUsername, onAuth, buttonSize])

  return (
    <div ref={containerRef} />
  )
}
