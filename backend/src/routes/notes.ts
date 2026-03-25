import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Env, Note } from '../types'

const notesRouter = new Hono<{ Bindings: Env }>()

// Validation schemas
const CreateNoteSchema = z.object({
  title: z.string().min(1, 'Title required'),
  content: z.string().optional().default('')
})

const UpdateNoteSchema = z.object({
  title: z.string().min(1, 'Title required').optional(),
  content: z.string().optional()
})

// GET /api/notes - List notes
notesRouter.get('/', async (c) => {
  const userId = c.get('userId') as string

  try {
    const notes = await c.env.DB
      .prepare('SELECT * FROM notes WHERE user_id = ? AND is_archived = 0 ORDER BY updated_at DESC')
      .bind(userId)
      .all<Note>()

    return c.json(notes.results || [])
  } catch (err) {
    console.error('GET /notes error:', err)
    return c.json({ error: 'Failed to fetch notes' }, 500)
  }
})

// POST /api/notes - Create note
notesRouter.post('/', zValidator('json', CreateNoteSchema), async (c) => {
  const userId = c.get('userId') as string
  const { title, content } = c.req.valid('json')

  try {
    const result = await c.env.DB
      .prepare('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)')
      .bind(userId, title, content)
      .run()

    return c.json(
      {
        id: result.meta.last_row_id,
        user_id: userId,
        title,
        content,
        tags: '[]',
        is_archived: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      201
    )
  } catch (err) {
    console.error('POST /notes error:', err)
    return c.json({ error: 'Failed to create note' }, 500)
  }
})

// GET /api/notes/:id - Get single note
notesRouter.get('/:id', async (c) => {
  const userId = c.get('userId') as string
  const noteId = c.req.param('id')

  try {
    const note = await c.env.DB
      .prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
      .bind(noteId, userId)
      .first<Note>()

    if (!note) {
      return c.json({ error: 'Note not found' }, 404)
    }

    return c.json(note)
  } catch (err) {
    console.error('GET /notes/:id error:', err)
    return c.json({ error: 'Failed to fetch note' }, 500)
  }
})

// PUT /api/notes/:id - Update note
notesRouter.put('/:id', zValidator('json', UpdateNoteSchema), async (c) => {
  const userId = c.get('userId') as string
  const noteId = c.req.param('id')
  const updates = c.req.valid('json')

  try {
    // Check if note exists and belongs to user
    const note = await c.env.DB
      .prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?')
      .bind(noteId, userId)
      .first()

    if (!note) {
      return c.json({ error: 'Note not found' }, 404)
    }

    // Build update query
    const fields: string[] = []
    const values: unknown[] = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      values.push(updates.title)
    }

    if (updates.content !== undefined) {
      fields.push('content = ?')
      values.push(updates.content)
    }

    fields.push('updated_at = datetime("now")')
    values.push(noteId, userId)

    const query = `UPDATE notes SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`

    await c.env.DB.prepare(query).bind(...values).run()

    return c.json({ success: true })
  } catch (err) {
    console.error('PUT /notes/:id error:', err)
    return c.json({ error: 'Failed to update note' }, 500)
  }
})

// DELETE /api/notes/:id - Delete note
notesRouter.delete('/:id', async (c) => {
  const userId = c.get('userId') as string
  const noteId = c.req.param('id')

  try {
    const result = await c.env.DB
      .prepare('DELETE FROM notes WHERE id = ? AND user_id = ?')
      .bind(noteId, userId)
      .run()

    if (result.meta.changes === 0) {
      return c.json({ error: 'Note not found' }, 404)
    }

    return c.json({ success: true })
  } catch (err) {
    console.error('DELETE /notes/:id error:', err)
    return c.json({ error: 'Failed to delete note' }, 500)
  }
})

export default notesRouter
