/**
 * Telegram Bot Service
 * Handles webhook verification, message routing, and API calls
 */

export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    chat: {
      id: number
      username?: string
    }
    from: {
      id: number
      first_name: string
      username?: string
    }
    text: string
    date: number
  }
}

export interface TelegramMessage {
  chat_id: number
  text: string
  message_id: number
  from_id: number
  timestamp: number
}

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

/**
 * Verify Telegram webhook signature using HMAC-SHA256
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyTelegramSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Create HMAC-SHA256 hash
    const encoder = new TextEncoder()
    const key = encoder.encode(secret)
    const data = encoder.encode(body)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature_computed = await crypto.subtle.sign('HMAC', cryptoKey, data)
    const hex = Array.from(new Uint8Array(signature_computed))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Constant-time comparison
    if (signature.length !== hex.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ hex.charCodeAt(i)
    }

    return result === 0
  } catch (err) {
    console.error('Signature verification error:', err)
    return false
  }
}

/**
 * Verify Telegram Login Widget data signature
 * Algorithm from: https://core.telegram.org/widgets/login
 * 1. Create data_check_string from sorted fields
 * 2. Compute secret_key = SHA256(bot_token)
 * 3. Compute HMAC-SHA256(data_check_string, secret_key)
 * 4. Compare with received hash
 * 5. Check auth_date is within 24 hours (replay attack prevention)
 */
export async function verifyTelegramLoginData(
  data: TelegramLoginData,
  botToken: string
): Promise<boolean> {
  try {
    const { hash, ...fields } = data

    // Step 1: Build data_check_string (sorted alphabetically)
    const dataCheckString = Object.entries(fields)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')

    const encoder = new TextEncoder()

    // Step 2: secret_key = SHA256(bot_token) — raw digest, NOT HMAC
    const secretKey = await crypto.subtle.digest('SHA-256', encoder.encode(botToken))

    // Step 3: HMAC-SHA256(data_check_string, secret_key)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(dataCheckString))
    const computedHash = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Step 4: Constant-time hash comparison
    if (hash.length !== computedHash.length) {
      return false
    }
    let result = 0
    for (let i = 0; i < hash.length; i++) {
      result |= hash.charCodeAt(i) ^ computedHash.charCodeAt(i)
    }
    if (result !== 0) {
      return false
    }

    // Step 5: Check auth_date is within 24 hours (prevent replay attacks)
    const authAge = Math.floor(Date.now() / 1000) - data.auth_date
    if (authAge > 86400) {
      console.warn('Telegram login data too old:', authAge, 'seconds')
      return false
    }

    return true
  } catch (err) {
    console.error('Telegram login data verification error:', err)
    return false
  }
}

/**
 * Send message via Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  token: string,
  options: {
    parse_mode?: 'Markdown' | 'HTML'
    reply_markup?: unknown
  } = {}
): Promise<Response> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`

  const payload = {
    chat_id: chatId,
    text,
    ...options
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  return response
}

/**
 * Parse Telegram update and extract message info
 */
export function parseTelegramUpdate(update: TelegramUpdate): TelegramMessage | null {
  if (!update.message || !update.message.text) {
    return null
  }

  const msg = update.message

  return {
    chat_id: msg.chat.id,
    text: msg.text,
    message_id: msg.message_id,
    from_id: msg.from.id,
    timestamp: msg.date * 1000
  }
}
