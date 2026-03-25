/**
 * Google Gemini API Service
 * Handles intent detection and AI responses
 */

export interface DetectedIntent {
  intent: string
  parameters: Record<string, unknown>
  confidence: number
  raw_text: string
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const INTENT_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: [
        'CREATE_NOTE',
        'CREATE_TODO',
        'QUERY_TODOS',
        'UPDATE_TODO',
        'DELETE_TODO',
        'HELP',
        'GENERAL_CHAT'
      ]
    },
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        todo_id: { type: 'string' },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'done']
        },
        query: { type: 'string' }
      }
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    raw_text: { type: 'string' }
  },
  required: ['intent', 'parameters', 'confidence', 'raw_text']
}

const SYSTEM_PROMPT = `Bạn là MOCU, trợ lý cá nhân thông minh. Phân tích tin nhắn người dùng tiếng Việt và phát hiện ý định.

Các intent được hỗ trợ:
- CREATE_NOTE: Lưu ghi chú (ví dụ: "ghi chú idea mới", "note: công việc hôm nay")
- CREATE_TODO: Tạo công việc (ví dụ: "nhắc tôi mua sữa", "cần làm: họp team")
- QUERY_TODOS: Hỏi về các công việc (ví dụ: "hôm nay tôi cần làm gì?", "xem todo")
- UPDATE_TODO: Cập nhật công việc (ví dụ: "đánh dấu xong công việc X")
- DELETE_TODO: Xóa công việc (ví dụ: "xóa công việc cũ")
- HELP: Yêu cầu trợ giúp (ví dụ: "/help", "bạn có thể làm gì?")
- GENERAL_CHAT: Chat thông thường hoặc không rõ ý định

Quy tắc:
- Nếu không chắc ý định → GENERAL_CHAT
- Confidence: 0.0-1.0 dựa trên độ chắc chắn
- Luôn trả về JSON hợp lệ, không giải thích thêm
- Giữ parameters đơn giản và có ích`

/**
 * Detect intent from user message using Gemini API with JSON Schema
 */
export async function detectIntent(
  message: string,
  apiKey: string
): Promise<DetectedIntent> {
  const model = 'gemini-2.0-flash'
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            parts: [{ text: message }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 256,
          responseMimeType: 'application/json',
          responseSchema: INTENT_SCHEMA
        }
      })
    })

    if (!response.ok) {
      console.error('Gemini API error:', response.statusText)
      return fallbackIntent(message)
    }

    const data = (await response.json()) as any
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      console.warn('No content from Gemini')
      return fallbackIntent(message)
    }

    const intent = JSON.parse(content) as DetectedIntent
    intent.raw_text = message
    return intent
  } catch (err) {
    console.error('Intent detection error:', err)
    return fallbackIntent(message)
  }
}

/**
 * Fallback intent detection using simple keyword matching
 */
export function fallbackIntent(message: string): DetectedIntent {
  const lowerMsg = message.toLowerCase()

  if (lowerMsg.match(/^\/help|help|trợ giúp|bạn có thể làm gì/i)) {
    return {
      intent: 'HELP',
      parameters: {},
      confidence: 1.0,
      raw_text: message
    }
  }

  if (lowerMsg.match(/^\/note|ghi chú|note|lưu ý/i)) {
    const match = message.match(/note[:\s]+(.+)/i)
    return {
      intent: 'CREATE_NOTE',
      parameters: { title: match?.[1] || 'Untitled' },
      confidence: 0.9,
      raw_text: message
    }
  }

  if (lowerMsg.match(/^\/todo|todo|làm|công việc|nhắc|cần/i)) {
    const match = message.match(/(?:todo|làm|cần)[:\s]+(.+)/i)
    return {
      intent: 'CREATE_TODO',
      parameters: { title: match?.[1] || 'Untitled' },
      confidence: 0.9,
      raw_text: message
    }
  }

  if (lowerMsg.match(/xem|danh sách|todo|công việc|hôm nay|cần làm gì/i)) {
    return {
      intent: 'QUERY_TODOS',
      parameters: {},
      confidence: 0.8,
      raw_text: message
    }
  }

  return {
    intent: 'GENERAL_CHAT',
    parameters: {},
    confidence: 0.5,
    raw_text: message
  }
}

/**
 * Generate helpful response message
 */
export function generateResponse(intent: DetectedIntent): string {
  const { intent: intentType, parameters } = intent

  switch (intentType) {
    case 'CREATE_NOTE':
      return `📝 Đã lưu ghi chú: "${parameters.title || 'Untitled'}"`

    case 'CREATE_TODO':
      return `✅ Tạo công việc: "${parameters.title || 'Untitled'}"`

    case 'QUERY_TODOS':
      return `📋 Đang lấy danh sách công việc...`

    case 'UPDATE_TODO':
      return `✏️ Cập nhật công việc xong!`

    case 'DELETE_TODO':
      return `🗑️ Xóa công việc thành công`

    case 'HELP':
      return `🤖 *MOCU — Trợ lý cá nhân*\n\n📝 /note <nội dung> — Tạo ghi chú\n✅ /todo <việc> — Tạo công việc\n📋 /todos — Xem danh sách\n💬 Hoặc chat tự nhiên, mình sẽ hiểu!`

    case 'GENERAL_CHAT':
    default:
      return `Hiểu rồi! Mình sẽ ghi nhớ lại.`
  }
}
