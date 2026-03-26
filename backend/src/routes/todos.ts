import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Env, Todo } from '../types'

const todosRouter = new Hono<{ Bindings: Env; Variables: { userId: string } }>()

// Validation schemas
const CreateTodoSchema = z.object({
  title: z.string().min(1, 'Title required'),
  description: z.string().optional().default(''),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  due_date: z.string().optional()
})

const UpdateTodoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  due_date: z.string().optional()
})

const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'done'])
})

// GET /api/todos - List todos
todosRouter.get('/', async (c) => {
  const userId = c.get('userId') as string
  const status = c.req.query('status')

  try {
    let query = 'SELECT * FROM todos WHERE user_id = ?'
    const params: unknown[] = [userId]

    if (status && ['pending', 'in_progress', 'done'].includes(status)) {
      query += ' AND status = ?'
      params.push(status)
    }

    query += ' ORDER BY priority DESC, created_at DESC'

    const stmt = c.env.DB.prepare(query).bind(...params)
    const todos = await stmt.all<Todo>()

    return c.json(todos.results || [])
  } catch (err) {
    console.error('GET /todos error:', err)
    return c.json({ error: 'Failed to fetch todos' }, 500)
  }
})

// POST /api/todos - Create todo
todosRouter.post('/', zValidator('json', CreateTodoSchema), async (c) => {
  const userId = c.get('userId') as string
  const { title, description, priority, due_date } = c.req.valid('json')

  try {
    const result = await c.env.DB
      .prepare(
        'INSERT INTO todos (user_id, title, description, priority, due_date) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(userId, title, description, priority, due_date || null)
      .run()

    return c.json(
      {
        id: result.meta.last_row_id,
        user_id: userId,
        title,
        description,
        status: 'pending',
        priority,
        due_date: due_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      201
    )
  } catch (err) {
    console.error('POST /todos error:', err)
    return c.json({ error: 'Failed to create todo' }, 500)
  }
})

// GET /api/todos/:id - Get single todo
todosRouter.get('/:id', async (c) => {
  const userId = c.get('userId') as string
  const todoId = c.req.param('id')

  try {
    const todo = await c.env.DB
      .prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
      .bind(todoId, userId)
      .first<Todo>()

    if (!todo) {
      return c.json({ error: 'Todo not found' }, 404)
    }

    return c.json(todo)
  } catch (err) {
    console.error('GET /todos/:id error:', err)
    return c.json({ error: 'Failed to fetch todo' }, 500)
  }
})

// PUT /api/todos/:id - Update todo
todosRouter.put('/:id', zValidator('json', UpdateTodoSchema), async (c) => {
  const userId = c.get('userId') as string
  const todoId = c.req.param('id')
  const updates = c.req.valid('json')

  try {
    const todo = await c.env.DB
      .prepare('SELECT id FROM todos WHERE id = ? AND user_id = ?')
      .bind(todoId, userId)
      .first()

    if (!todo) {
      return c.json({ error: 'Todo not found' }, 404)
    }

    const fields: string[] = []
    const values: unknown[] = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      values.push(updates.title)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?')
      values.push(updates.priority)
    }
    if (updates.due_date !== undefined) {
      fields.push('due_date = ?')
      values.push(updates.due_date)
    }

    fields.push('updated_at = datetime("now")')
    values.push(todoId, userId)

    const query = `UPDATE todos SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
    await c.env.DB.prepare(query).bind(...values).run()

    return c.json({ success: true })
  } catch (err) {
    console.error('PUT /todos/:id error:', err)
    return c.json({ error: 'Failed to update todo' }, 500)
  }
})

// PATCH /api/todos/:id/status - Update status only
todosRouter.patch('/:id/status', zValidator('json', UpdateStatusSchema), async (c) => {
  const userId = c.get('userId') as string
  const todoId = c.req.param('id')
  const { status } = c.req.valid('json')

  try {
    const todo = await c.env.DB
      .prepare('SELECT id FROM todos WHERE id = ? AND user_id = ?')
      .bind(todoId, userId)
      .first()

    if (!todo) {
      return c.json({ error: 'Todo not found' }, 404)
    }

    await c.env.DB
      .prepare('UPDATE todos SET status = ?, updated_at = datetime("now") WHERE id = ? AND user_id = ?')
      .bind(status, todoId, userId)
      .run()

    return c.json({ success: true })
  } catch (err) {
    console.error('PATCH /todos/:id/status error:', err)
    return c.json({ error: 'Failed to update todo status' }, 500)
  }
})

// DELETE /api/todos/:id - Delete todo
todosRouter.delete('/:id', async (c) => {
  const userId = c.get('userId') as string
  const todoId = c.req.param('id')

  try {
    const result = await c.env.DB
      .prepare('DELETE FROM todos WHERE id = ? AND user_id = ?')
      .bind(todoId, userId)
      .run()

    if (result.meta.changes === 0) {
      return c.json({ error: 'Todo not found' }, 404)
    }

    return c.json({ success: true })
  } catch (err) {
    console.error('DELETE /todos/:id error:', err)
    return c.json({ error: 'Failed to delete todo' }, 500)
  }
})

export default todosRouter
