import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isTest = process.env.NODE_ENV === 'test'
const dbPath = isTest ? 'chess.test.sqlite' : 'chess.sqlite'
const sqlite = new Database(dbPath)
export const db = drizzle(sqlite, { schema })

if (isTest) {
  // Auto-migrate test database to keep it in sync with schema
  migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') })
}
