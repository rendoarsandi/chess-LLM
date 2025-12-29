import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database, { Database as SQLiteDatabase } from 'better-sqlite3'
import * as schema from './schema'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import path from 'path'
import { fileURLToPath } from 'url'
import { AppDatabase } from './types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isTest = process.env.NODE_ENV === 'test'

let _sqlite: SQLiteDatabase
let _db: AppDatabase

export function initDb() {
  if (_db) return _db

  const dbName = isTest ? 'chess.test.sqlite' : 'chess.sqlite'
  const dbPath = path.resolve(__dirname, '../../', dbName)

  console.log(`[DB] Opening database at: ${dbPath}`)
  _sqlite = new Database(dbPath)
  _sqlite.pragma('foreign_keys = ON')

  _db = drizzle(_sqlite, { schema })

  if (isTest) {
    const migrationsPath = path.resolve(__dirname, '../../drizzle')
    console.log(`[DB] Migrations path: ${migrationsPath}`)
    try {
      migrate(_db, { migrationsFolder: migrationsPath })
      console.log('[DB] Migrations applied successfully')

      // TEST INSERT
      try {
        _sqlite
          .prepare(
            'INSERT INTO players (id, name, type, wins960, losses960, draws960, rating960, peak_rating960) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .run('test-id', 'test-name', 'human', 0, 0, 0, 1200, 1200)
        console.log('[DB] Raw insert test passed')
        _sqlite.prepare('DELETE FROM players WHERE id = ?').run('test-id')
      } catch (e) {
        console.error('[DB] Raw insert test FAILED:', e)
      }
    } catch (err) {
      console.error('[DB] Migration failed:', err)
    }

    // Refresh the Drizzle instance
    _db = drizzle(_sqlite, { schema })
  }

  return _db
}

export const getDb = () => {
  _db = _db || initDb()

  // AGGRESSIVE SCHEMA SYNC FOR TESTS
  if (isTest && _sqlite) {
    try {
      const colsInfo = _sqlite.prepare('PRAGMA table_info(players)').all() as { name: string }[]
      const cols = colsInfo.map((c) => c.name)
      console.log(`[DB] Players table columns: ${cols.join(', ')}`)
      const required = ['wins960', 'rating960', 'losses960', 'draws960', 'peak_rating960']
      let added = false
      for (const col of required) {
        if (!cols.includes(col)) {
          console.log(`[DB] Manually adding missing column: ${col}`)
          _sqlite
            .prepare(
              `ALTER TABLE players ADD COLUMN 
${col}
 INTEGER DEFAULT 0 NOT NULL`,
            )
            .run()
          added = true
        }
      }
      if (added) {
        _db = drizzle(_sqlite, { schema })
      }
    } catch (e) {
      console.error('[DB] Aggressive sync failed:', e)
    }
  }

  return _db
}

export const getSqliteClient = () => {
  if (!_sqlite) initDb()
  return _sqlite
}

export const db = getDb()
