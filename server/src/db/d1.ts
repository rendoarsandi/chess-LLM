/// <reference types="@cloudflare/workers-types" />

import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'
import { AppDatabase } from './types'

export function createD1Database(database: D1Database): AppDatabase {
  return drizzle(database, { schema }) as unknown as AppDatabase
}
