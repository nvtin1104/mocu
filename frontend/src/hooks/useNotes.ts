import { useState, useEffect } from 'react'
import { createApiClient } from '../lib/api'

export interface Note {
  id: string | number
  user_id: string
  title: string
  content: string
  tags: string | string[]
  is_archived: number | boolean
  created_at: string
  updated_at: string
}

export function useNotes(token?: string | null) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const api = createApiClient(token)

  const fetchNotes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<Note[]>('/api/notes')
      setNotes(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchNotes()
    }
  }, [token])

  const createNote = async (title: string, content: string) => {
    try {
      const note = await api.post<Note>('/api/notes', { title, content })
      setNotes([note, ...notes])
      return note
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note')
      throw err
    }
  }

  const updateNote = async (id: string | number, title: string, content: string) => {
    try {
      await api.put(`/api/notes/${id}`, { title, content })
      setNotes(notes.map(n => (n.id === id ? { ...n, title, content } : n)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note')
      throw err
    }
  }

  const deleteNote = async (id: string | number) => {
    try {
      await api.delete(`/api/notes/${id}`)
      setNotes(notes.filter(n => n.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note')
      throw err
    }
  }

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes
  }
}
