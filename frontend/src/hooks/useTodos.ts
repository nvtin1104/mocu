import { useState, useEffect } from 'react'
import { createApiClient } from '../lib/api'

export interface Todo {
  id: string | number
  user_id: string
  title: string
  status: 'pending' | 'completed'
  created_at: string
  updated_at: string
}

export function useTodos(token?: string | null) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const api = createApiClient(token)

  const fetchTodos = async (status?: 'pending' | 'completed') => {
    setLoading(true)
    setError(null)
    try {
      const path = status ? `/api/todos?status=${status}` : '/api/todos'
      const data = await api.get<Todo[]>(path)
      setTodos(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch todos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchTodos()
    }
  }, [token])

  const createTodo = async (title: string) => {
    try {
      const todo = await api.post<Todo>('/api/todos', { title })
      setTodos([todo, ...todos])
      return todo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create todo')
      throw err
    }
  }

  const updateTodo = async (id: string | number, status: 'pending' | 'completed') => {
    try {
      await api.put(`/api/todos/${id}`, { status })
      setTodos(todos.map(t => (t.id === id ? { ...t, status } : t)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo')
      throw err
    }
  }

  const deleteTodo = async (id: string | number) => {
    try {
      await api.delete(`/api/todos/${id}`)
      setTodos(todos.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete todo')
      throw err
    }
  }

  return {
    todos,
    loading,
    error,
    createTodo,
    updateTodo,
    deleteTodo,
    refetch: fetchTodos
  }
}
