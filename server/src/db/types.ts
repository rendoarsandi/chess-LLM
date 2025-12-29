import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type AppDatabase = BetterSQLite3Database<typeof schema>
export type GenericDatabase = BetterSQLite3Database<Record<string, unknown>>
