import { betterAuth } from 'better-auth'
import { getSqliteClient } from '../db'
import { Database as SQLiteDatabase } from 'better-sqlite3'

export const auth = betterAuth({
  database: {
    db: getSqliteClient() as SQLiteDatabase,
    type: 'sqlite',
  },
  emailAndPassword: {
    enabled: true,
  },
})
