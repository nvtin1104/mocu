// Environment bindings
export interface Env {
  DB: D1Database
  KV: KVNamespace
  JWT_SECRET: string
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_SECRET?: string
  GEMINI_API_KEY?: string
  API_VERSION: string
  LOG_LEVEL: string
  TELEGRAM_BOT_USERNAME: string
}

// Database types
export interface User {
  id: string
  telegram_chat_id: string
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  tags: string
  is_archived: number
  created_at: string
  updated_at: string
}

export interface Todo {
  id: string
  user_id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  created_at: string
  updated_at: string
}

// API Request/Response types
export interface LoginRequest {
  chat_id: string
}

export interface LoginResponse {
  token: string
  user_id: string
}

export interface CreateNoteRequest {
  title: string
  content?: string
  tags?: string[]
}

export interface CreateTodoRequest {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
}

export interface UpdateTodoStatusRequest {
  status: 'pending' | 'in_progress' | 'done'
}

// JWT payload
export interface JWTPayload {
  sub: string // telegram_chat_id
  exp: number
  iat?: number
}
