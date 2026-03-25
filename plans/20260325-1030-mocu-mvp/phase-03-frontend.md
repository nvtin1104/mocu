# Phase 3: Frontend (React + shadcn/ui)

**Duration:** Days 6-12 | **Dependencies:** Phase 1 API | **Parallel:** Phase 2

## Overview

Build React SPA with Notes and Todos management. Two main pages with create/read/update/delete functionality, integrated with Phase 1 backend API via JWT authentication.

**Deliverables:**
- ✅ React app (Vite) with Tailwind + shadcn/ui
- ✅ Notes page (list, create, edit, delete, search)
- ✅ Todos page (list, create, mark done, delete, filter by status)
- ✅ API client with JWT token management
- ✅ Authentication flow (Telegram chat_id login)
- ✅ Error handling & loading states

## Context & Key Insights

**From Research:**
- Vite for fast dev experience (React fast refresh)
- shadcn/ui provides unstyled, accessible components
- Tailwind CSS for styling (dark mode friendly)
- JWT stored in localStorage (simple MVP auth)
- API client with request interceptor for auth header
- React hooks pattern (useState, useEffect, custom hooks)

## Requirements

### Tech Stack
- React 18+ (via Vite)
- Tailwind CSS (configured)
- shadcn/ui components (Button, Input, Dialog, Tabs, Card)
- TypeScript (type safety)
- Lucide Icons (UI icons)
- SWR or fetch API (data fetching)

### Pages & Routes
```
/login           → Telegram chat_id input
/notes           → List notes, create, edit, delete
/todos           → List todos, create, mark done, delete
/                → Redirect to /notes or /login
```

### Component Structure
```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── NotesPage.tsx
│   ├── TodosPage.tsx
│   ├── LoginPage.tsx
│   └── Sidebar.tsx
├── hooks/
│   ├── useAuth.ts             # JWT token management
│   ├── useNotes.ts            # Notes API calls
│   └── useTodos.ts            # Todos API calls
├── lib/
│   ├── api.ts                 # API client with interceptor
│   └── constants.ts
├── App.tsx                    # Main app + routing
└── main.tsx
```

## Architecture

```
┌─────────────────────────────┐
│       React App (Vite)      │
│                             │
│  ┌─────────────────────┐    │
│  │ LoginPage           │    │
│  │ (chat_id input)     │    │
│  └────────┬────────────┘    │
│           ↓ (POST /auth)    │
│  ┌─────────────────────┐    │
│  │ NotesPage           │    │
│  │ ├─ List notes       │    │
│  │ ├─ Create note      │    │
│  │ └─ Edit note        │    │
│  └────────┬────────────┘    │
│           ↓                 │
│  ┌─────────────────────┐    │
│  │ TodosPage           │    │
│  │ ├─ List todos       │    │
│  │ ├─ Create todo      │    │
│  │ └─ Mark done        │    │
│  └─────────────────────┘    │
│           ↑                 │
│      localStorage            │
│     (JWT token)              │
└────────┬──────────────────┬──┘
         │                  │
    ┌────▼─────┐       ┌────▼────┐
    │ API Client│       │ useAuth │
    │ (axios)   │       │ (hook)  │
    └────┬─────┘       └────┬────┘
         │ Authorization    │
         └────┬─────────────┘
              ↓
    Cloudflare Worker API
```

## Implementation Steps

### Step 1: Initialize Vite Project (Day 6)

```bash
npm create vite@latest mocu-frontend -- --template react-ts
cd mocu-frontend
npm install -D tailwindcss postcss autoprefixer
npm install -D typescript @types/react @types/react-dom
npm install clsx class-variance-authority lucide-react
npm install shadcn-ui

# Initialize Tailwind
npx tailwindcss init -p

# Install shadcn/ui components
npx shadcn-ui@latest init -d
npx shadcn-ui@latest add button input dialog card tabs textarea dropdown-menu
```

### Step 2: Setup Directory Structure (Day 6)

```bash
mkdir -p src/{components,hooks,lib,pages}
touch src/lib/{api.ts,constants.ts}
touch src/hooks/{useAuth.ts,useNotes.ts,useTodos.ts}
touch src/components/{LoginPage.tsx,NotesPage.tsx,TodosPage.tsx,Sidebar.tsx}
```

### Step 3: Implement API Client (Day 6)

File: `src/lib/api.ts`
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export interface ApiClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, data: unknown): Promise<T>
  put<T>(path: string, data: unknown): Promise<T>
  delete<T>(path: string): Promise<T>
}

export function createApiClient(token?: string): ApiClient {
  const headers = (additional = {}) => ({
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...additional
  })

  return {
    async get<T>(path: string): Promise<T> {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: headers()
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },

    async post<T>(path: string, data: unknown): Promise<T> {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },

    async put<T>(path: string, data: unknown): Promise<T> {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },

    async delete<T>(path: string): Promise<T> {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        headers: headers()
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    }
  }
}
```

### Step 4: Authentication Hook (Day 7)

File: `src/hooks/useAuth.ts`
```typescript
import { useState, useEffect } from 'react'
import { createApiClient } from '../lib/api'

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('mocu_token')
  )
  const [userId, setUserId] = useState<string | null>(
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUserId(null)
    localStorage.removeItem('mocu_token')
    localStorage.removeItem('mocu_user_id')
  }

  return { token, userId, loading, error, login, logout, isAuthenticated: !!token }
}
```

### Step 5: Data Fetching Hooks (Day 7)

File: `src/hooks/useNotes.ts`
```typescript
import { useState, useEffect } from 'react'
import { createApiClient } from '../lib/api'

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  tags: string
  is_archived: boolean
  created_at: string
  updated_at: string
}

export function useNotes(token?: string | null) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const api = createApiClient(token || undefined)

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const data = await api.get<Note[]>('/api/notes')
      setNotes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchNotes()
  }, [token])

  const createNote = async (title: string, content: string) => {
    try {
      const note = await api.post<Note>('/api/notes', { title, content })
      setNotes([note, ...notes])
      return note
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note')
    }
  }

  const updateNote = async (id: string, title: string, content: string) => {
    try {
      await api.put(`/api/notes/${id}`, { title, content })
      setNotes(notes.map(n => n.id === id ? { ...n, title, content } : n))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note')
    }
  }

  const deleteNote = async (id: string) => {
    try {
      await api.delete(`/api/notes/${id}`)
      setNotes(notes.filter(n => n.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note')
    }
  }

  return { notes, loading, error, createNote, updateNote, deleteNote, refetch: fetchNotes }
}
```

File: `src/hooks/useTodos.ts`
```typescript
import { useState, useEffect } from 'react'
import { createApiClient } from '../lib/api'

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

export function useTodos(token?: string | null) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const api = createApiClient(token || undefined)

  const fetchTodos = async (status?: string) => {
    setLoading(true)
    try {
      const query = status ? `?status=${status}` : ''
      const data = await api.get<Todo[]>(`/api/todos${query}`)
      setTodos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch todos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchTodos()
  }, [token])

  const createTodo = async (title: string, priority: string = 'medium') => {
    try {
      const todo = await api.post<Todo>('/api/todos', { title, priority })
      setTodos([todo, ...todos])
      return todo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create todo')
    }
  }

  const updateStatus = async (id: string, status: 'pending' | 'in_progress' | 'done') => {
    try {
      await api.patch(`/api/todos/${id}/status`, { status })
      setTodos(todos.map(t => t.id === id ? { ...t, status } : t))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo')
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      await api.delete(`/api/todos/${id}`)
      setTodos(todos.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete todo')
    }
  }

  return { todos, loading, error, createTodo, updateStatus, deleteTodo, refetch: fetchTodos }
}
```

### Step 6: UI Components (Day 7-8)

File: `src/components/LoginPage.tsx`
```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export function LoginPage({ onLogin }: { onLogin: (chatId: string) => void }) {
  const [chatId, setChatId] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <Card className="w-96 p-6 border-zinc-800">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white">🤖 MOCU</h1>
          <p className="text-zinc-400 mt-2">Personal AI Assistant</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Telegram Chat ID
            </label>
            <Input
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="e.g. 123456789"
              className="bg-zinc-900 border-zinc-700"
              onKeyDown={(e) => e.key === 'Enter' && onLogin(chatId)}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Get your ID: send /id to @userinfobot on Telegram
            </p>
          </div>

          <Button
            onClick={() => onLogin(chatId)}
            disabled={!chatId.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500"
          >
            Login
          </Button>
        </div>
      </Card>
    </div>
  )
}
```

File: `src/components/NotesPage.tsx`
```typescript
import { useState } from 'react'
import { useNotes } from '@/hooks/useNotes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil } from 'lucide-react'

export function NotesPage({ token }: { token: string }) {
  const { notes, createNote, updateNote, deleteNote, loading } = useNotes(token)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const handleSubmit = async () => {
    if (editId) {
      await updateNote(editId, title, content)
      setEditId(null)
    } else {
      await createNote(title, content)
    }
    setTitle('')
    setContent('')
    setOpen(false)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">📝 Notes</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-500">
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-700">
            <h2 className="text-xl font-bold text-white mb-4">
              {editId ? 'Edit Note' : 'New Note'}
            </h2>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="bg-zinc-800 border-zinc-700 text-white mb-3"
            />
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Content"
              className="bg-zinc-800 border-zinc-700 text-white mb-3 h-40"
            />
            <Button
              onClick={handleSubmit}
              className="w-full bg-indigo-600 hover:bg-indigo-500"
            >
              {editId ? 'Update' : 'Create'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-zinc-400">Loading notes...</p>}

      <div className="grid gap-4">
        {notes.map((note) => (
          <Card
            key={note.id}
            className="p-4 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-white">{note.title}</h3>
                <p className="text-zinc-400 text-sm mt-2">{note.content.slice(0, 100)}...</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTitle(note.title)
                    setContent(note.content)
                    setEditId(note.id)
                    setOpen(true)
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteNote(note.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

File: `src/components/TodosPage.tsx`
```typescript
import { useState } from 'react'
import { useTodos } from '@/hooks/useTodos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'

export function TodosPage({ token }: { token: string }) {
  const { todos, createTodo, updateStatus, deleteTodo } = useTodos(token)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending')

  const filtered = todos.filter(t =>
    filter === 'all' ? true : t.status === filter
  )

  const handleCreate = async () => {
    await createTodo(title, priority)
    setTitle('')
    setPriority('medium')
    setOpen(false)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">✅ Todos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-500">
              <Plus className="w-4 h-4 mr-2" />
              New Todo
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-700">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="bg-zinc-800 border-zinc-700 text-white mb-3"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2 rounded mb-3"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <Button
              onClick={handleCreate}
              className="w-full bg-indigo-600 hover:bg-indigo-500"
            >
              Create
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'done'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
            className={filter === f ? 'bg-indigo-600' : 'border-zinc-700'}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((todo) => (
          <div
            key={todo.id}
            className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition"
          >
            <Checkbox
              checked={todo.status === 'done'}
              onCheckedChange={(checked) =>
                updateStatus(todo.id, checked ? 'done' : 'pending')
              }
            />
            <span className={todo.status === 'done' ? 'line-through text-zinc-500' : 'text-white'}>
              {todo.title}
            </span>
            <span className={`ml-auto text-xs px-2 py-1 rounded ${
              todo.priority === 'high' ? 'bg-red-900 text-red-100' :
              todo.priority === 'medium' ? 'bg-yellow-900 text-yellow-100' :
              'bg-blue-900 text-blue-100'
            }`}>
              {todo.priority}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteTodo(todo.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Step 7: Main App & Routing (Day 8)

File: `src/App.tsx`
```typescript
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/components/LoginPage'
import { NotesPage } from '@/components/NotesPage'
import { TodosPage } from '@/components/TodosPage'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function App() {
  const { token, login, logout, isAuthenticated } = useAuth()
  const [page, setPage] = useState<'notes' | 'todos'>('notes')

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      {/* Sidebar */}
      <div className="w-48 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col">
        <h2 className="text-2xl font-bold mb-6">🤖 MOCU</h2>

        <nav className="space-y-2 flex-1">
          <button
            onClick={() => setPage('notes')}
            className={`w-full text-left px-4 py-2 rounded transition ${
              page === 'notes'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            📝 Notes
          </button>
          <button
            onClick={() => setPage('todos')}
            className={`w-full text-left px-4 py-2 rounded transition ${
              page === 'todos'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            ✅ Todos
          </button>
        </nav>

        <Button
          onClick={logout}
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-400"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {page === 'notes' && <NotesPage token={token!} />}
        {page === 'todos' && <TodosPage token={token!} />}
      </div>
    </div>
  )
}

export default App
```

### Step 8: Build & Deploy (Day 12)

```bash
# Create .env.local
echo "VITE_API_URL=https://mocu-api.YOUR-SUBDOMAIN.workers.dev" > .env.local

# Build
npm run build

# Deploy to Cloudflare Pages
npm install -D wrangler
wrangler pages deploy dist --project-name=mocu-frontend
```

## Todo List

- [ ] Create Vite React project
- [ ] Install Tailwind + shadcn/ui
- [ ] Setup directory structure
- [ ] Implement API client
- [ ] Create useAuth hook
- [ ] Create useNotes hook
- [ ] Create useTodos hook
- [ ] Build LoginPage component
- [ ] Build NotesPage component
- [ ] Build TodosPage component
- [ ] Implement routing
- [ ] Test API integration
- [ ] Build & deploy to Cloudflare Pages

## Success Criteria

- [ ] Login page accepts chat ID and retrieves JWT token
- [ ] Notes page lists all notes with create/edit/delete
- [ ] Todos page lists todos with status toggle
- [ ] JWT token persists in localStorage
- [ ] API calls include Authorization header
- [ ] Dark theme (zinc/indigo) applies globally
- [ ] Responsive layout works on mobile
- [ ] Error messages display to user

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| CORS issues | Medium | Configure Phase 1 CORS headers |
| Token expiration | Low | Refresh token on 401 error |
| API downtime | Medium | Show offline message |
| localStorage security | Low | Use HttpOnly cookie in Phase 4 |

## Security Considerations

- ⚠️ JWT stored in localStorage (XSS risk, upgrade to HttpOnly in Phase 4)
- ✅ Authorization header on all protected requests
- ✅ No credentials exposed in code
- ✅ HTTPS only (Cloudflare Pages enforces)

## Next Steps

→ **Phase 4:** Integration testing + production deployment
