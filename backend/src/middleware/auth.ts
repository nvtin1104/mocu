import { MiddlewareHandler } from 'hono'
import { verify } from 'hono/jwt'

export const jwtAuth: MiddlewareHandler<{ Bindings: any; Variables: { userId: string } }> = async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const payload = (await verify(token, c.env.JWT_SECRET, 'HS256')) as any
    const userId = payload.sub as string

    if (!userId) {
      return c.json({ error: 'Invalid token - no user id' }, 401)
    }

    c.set('userId', userId)
    return await next()
  } catch (err) {
    return c.json({ error: 'Invalid token' }, 401)
  }
}
