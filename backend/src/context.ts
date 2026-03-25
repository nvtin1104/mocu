import { Context } from 'hono'
import { Env } from './types'

export type AppContext = Context<{ Bindings: Env; Variables: { userId: string } }>
