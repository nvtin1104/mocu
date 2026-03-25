import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNotes } from '../hooks/useNotes'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus } from 'lucide-react'

export function NotesPage() {
  const navigate = useNavigate()
  const { logout, token } = useAuth()
  const { notes, loading, error, createNote, deleteNote } = useNotes(token)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setCreating(true)
    try {
      await createNote(title, content)
      setTitle('')
      setContent('')
    } catch (err) {
      console.error('Failed to create note:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(id)
      } catch (err) {
        console.error('Failed to delete note:', err)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-card-foreground">My Notes</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/todos')}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90"
            >
              Todos
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:opacity-90"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Create Note</h2>
              <form onSubmit={handleCreateNote} className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    disabled={creating}
                  />
                </div>
                <div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Content"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm h-32 resize-none"
                    disabled={creating}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating || !title.trim() || !content.trim()}
                  className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  {creating ? 'Creating...' : 'Add Note'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            {error && (
              <div className="bg-destructive/20 border border-destructive rounded-md p-4 mb-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading notes...</p>
              </div>
            )}

            {!loading && notes.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No notes yet. Create one to get started!</p>
              </div>
            )}

            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="bg-card rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-card-foreground">{note.title}</h3>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      title="Delete note"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-foreground mb-3 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
