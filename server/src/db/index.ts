import * as schema from './schema'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import path from 'path'
import { fileURLToPath } from 'url'
import { AppDatabase } from './types'
import { createDrizzleDatabase } from './driver'
import { createSqliteClient, type SqliteClient } from './sqlite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isTest = process.env.NODE_ENV === 'test'

let _sqlite: SqliteClient
let _db: AppDatabase

export function initDb() {
  if (_db) return _db

  const dbName = isTest ? 'chess.test.sqlite' : 'chess.sqlite'
  const dbPath = path.resolve(__dirname, '../../', dbName)

  _sqlite = createSqliteClient(dbPath)
  _sqlite.pragma('foreign_keys = ON')

  _db = createDrizzleDatabase<typeof schema>(_sqlite, { schema })

  const migrationsPath = path.resolve(__dirname, '../../drizzle')
  migrate(_db, { migrationsFolder: migrationsPath })

  return _db
}

export const getDb = () => {
  return _db || initDb()
}

export const getSqliteClient = () => {
  if (!_sqlite) initDb()
  return _sqlite
}

export const getNativeSqliteClient = () => {
  if (!_sqlite) initDb()
  return _sqlite.native
}

export const db = getDb()
