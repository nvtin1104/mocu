import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTodos } from '../hooks/useTodos'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, CheckCircle2, Circle } from 'lucide-react'

export function TodosPage() {
  const navigate = useNavigate()
  const { logout, token } = useAuth()
  const { todos, loading, error, createTodo, updateTodo, deleteTodo } = useTodos(token)
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setCreating(true)
    try {
      await createTodo(title)
      setTitle('')
    } catch (err) {
      console.error('Failed to create todo:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id: string | number, status: string) => {
    const newStatus = status === 'pending' ? 'completed' : 'pending'
    try {
      await updateTodo(id, newStatus as 'pending' | 'completed')
    } catch (err) {
      console.error('Failed to update todo:', err)
    }
  }

  const handleDelete = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this todo?')) {
      try {
        await deleteTodo(id)
      } catch (err) {
        console.error('Failed to delete todo:', err)
      }
    }
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'pending') return todo.status === 'pending'
    if (filter === 'completed') return todo.status === 'completed'
    return true
  })

  const pendingCount = todos.filter(t => t.status === 'pending').length
  const completedCount = todos.filter(t => t.status === 'completed').length

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-card-foreground">My Todos</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/notes')}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90"
            >
              Notes
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-card rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">Add Todo</h2>
          <form onSubmit={handleCreateTodo} className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={creating}
            />
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={18} />
              Add
            </button>
          </form>
        </div>

        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-card-foreground hover:bg-input'
              }`}
            >
              All ({todos.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filter === 'pending'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-card-foreground hover:bg-input'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-md transition-colors ${
                filter === 'completed'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-card-foreground hover:bg-input'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/20 border border-destructive rounded-md p-4 mb-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading todos...</p>
          </div>
        )}

        {!loading && filteredTodos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {filter === 'all' && 'No todos yet. Create one to get started!'}
              {filter === 'pending' && 'All done! No pending todos.'}
              {filter === 'completed' && 'No completed todos yet.'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {filteredTodos.map((todo) => (
            <div key={todo.id} className="bg-card rounded-lg shadow p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <button
                onClick={() => handleToggle(todo.id, todo.status)}
                className="flex-shrink-0 text-primary hover:opacity-70"
                title={todo.status === 'pending' ? 'Mark as done' : 'Mark as pending'}
              >
                {todo.status === 'completed' ? (
                  <CheckCircle2 size={24} className="text-green-500" />
                ) : (
                  <Circle size={24} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-card-foreground ${todo.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                  {todo.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(todo.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(todo.id)}
                className="flex-shrink-0 p-1 text-destructive hover:bg-destructive/10 rounded"
                title="Delete todo"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
