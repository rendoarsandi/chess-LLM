import { DatabaseSync } from 'node:sqlite'
import type { Database, SqlValue } from './database'

export class NodeDatabase implements Database {
  private connection: DatabaseSync
  constructor(filename: string) {
    this.connection = new DatabaseSync(filename)
    this.connection.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
  }
  query<T>(sql: string, ...values: SqlValue[]): T[] {
    return this.connection.prepare(sql).all(...values) as T[]
  }
  transaction<T>(operation: () => T): T {
    this.connection.exec('BEGIN IMMEDIATE')
    try {
      const result = operation()
      this.connection.exec('COMMIT')
      return result
    } catch (error) {
      this.connection.exec('ROLLBACK')
      throw error
    }
  }
  close() {
    this.connection.close()
  }
}
