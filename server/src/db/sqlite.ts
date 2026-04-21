import { createRequire } from 'module'

const require = createRequire(import.meta.url)

export type SqliteParam = unknown

export interface SqliteRunResult {
  changes: number
  lastInsertRowid: number | bigint
}

export interface SqliteStatement {
  run(...params: SqliteParam[]): SqliteRunResult
  all(...params: SqliteParam[]): unknown[]
  get(...params: SqliteParam[]): unknown
  raw(): SqliteStatement
}

export interface SqliteTransactionRunner<T = unknown> {
  deferred(tx: T): T
  immediate(tx: T): T
  exclusive(tx: T): T
}

export interface SqliteClient {
  readonly driver: 'better-sqlite3' | 'node:sqlite'
  readonly native: unknown
  prepare(sql: string): SqliteStatement
  exec(sql: string): void
  pragma(source: string): unknown[]
  transaction<T>(fn: (tx: T) => T): SqliteTransactionRunner<T>
  close(): void
}

interface BetterSqliteStatementLike {
  run(...params: SqliteParam[]): SqliteRunResult
  all(...params: SqliteParam[]): unknown[]
  get(...params: SqliteParam[]): unknown
  raw(): BetterSqliteStatementLike
}

interface BetterSqliteDatabaseLike {
  prepare(sql: string): BetterSqliteStatementLike
  exec(sql: string): void
  pragma(source: string): unknown[]
  transaction<T>(fn: (tx: T) => T): SqliteTransactionRunner<T>
  close(): void
}

interface NodeSqliteStatementLike {
  run(...params: SqliteParam[]): SqliteRunResult
  all(...params: SqliteParam[]): unknown[]
  get(...params: SqliteParam[]): unknown
  setReturnArrays(enabled: boolean): void
}

interface NodeSqliteDatabaseLike {
  prepare(sql: string): NodeSqliteStatementLike
  exec(sql: string): void
  close(): void
}

type BetterSqliteConstructor = new (source: string | Buffer) => BetterSqliteDatabaseLike
type NodeSqliteConstructor = new (source: string) => NodeSqliteDatabaseLike

class BetterSqliteStatement implements SqliteStatement {
  constructor(private readonly statement: BetterSqliteStatementLike) {}

  run(...params: SqliteParam[]) {
    return this.statement.run(...params)
  }

  all(...params: SqliteParam[]) {
    return this.statement.all(...params)
  }

  get(...params: SqliteParam[]) {
    return this.statement.get(...params)
  }

  raw() {
    return new BetterSqliteStatement(this.statement.raw())
  }
}

class BetterSqliteClient implements SqliteClient {
  readonly driver = 'better-sqlite3' as const
  readonly native: BetterSqliteDatabaseLike

  constructor(database: BetterSqliteDatabaseLike) {
    this.native = database
  }

  prepare(sql: string) {
    return new BetterSqliteStatement(this.native.prepare(sql))
  }

  exec(sql: string) {
    this.native.exec(sql)
  }

  pragma(source: string) {
    return this.native.pragma(source)
  }

  transaction<T>(fn: (tx: T) => T) {
    return this.native.transaction(fn)
  }

  close() {
    this.native.close()
  }
}

class NodeSqliteStatement implements SqliteStatement {
  constructor(
    private readonly statement: NodeSqliteStatementLike,
    private readonly returnArrays = false,
  ) {}

  run(...params: SqliteParam[]) {
    this.statement.setReturnArrays(false)
    return this.statement.run(...params)
  }

  all(...params: SqliteParam[]) {
    this.statement.setReturnArrays(this.returnArrays)
    return this.statement.all(...params)
  }

  get(...params: SqliteParam[]) {
    this.statement.setReturnArrays(this.returnArrays)
    return this.statement.get(...params)
  }

  raw() {
    return new NodeSqliteStatement(this.statement, true)
  }
}

class NodeSqliteClient implements SqliteClient {
  readonly driver = 'node:sqlite' as const
  readonly native: NodeSqliteDatabaseLike

  constructor(database: NodeSqliteDatabaseLike) {
    this.native = database
  }

  prepare(sql: string) {
    return new NodeSqliteStatement(this.native.prepare(sql))
  }

  exec(sql: string) {
    this.native.exec(sql)
  }

  pragma(source: string) {
    const sql = `PRAGMA ${source}`
    if (source.includes('=')) {
      this.exec(sql)
      return []
    }
    return this.prepare(sql).all()
  }

  transaction<T>(fn: (tx: T) => T) {
    const run = (behavior: 'deferred' | 'immediate' | 'exclusive') => (tx: T) => {
      this.exec(`begin ${behavior}`)
      try {
        const result = fn(tx)
        this.exec('commit')
        return result
      } catch (error) {
        this.exec('rollback')
        throw error
      }
    }

    return {
      deferred: run('deferred'),
      immediate: run('immediate'),
      exclusive: run('exclusive'),
    }
  }

  close() {
    this.native.close()
  }
}

function getBetterSqliteConstructor(): BetterSqliteConstructor | undefined {
  try {
    return require('better-sqlite3') as BetterSqliteConstructor
  } catch {
    return undefined
  }
}

function getNodeSqliteConstructor(): NodeSqliteConstructor {
  const sqlite = require('node:sqlite') as { DatabaseSync: NodeSqliteConstructor }
  return sqlite.DatabaseSync
}

export function createSqliteClient(source: string | Buffer): SqliteClient {
  if (process.env.CHESSLLM_SQLITE_DRIVER !== 'node') {
    const BetterSqlite = getBetterSqliteConstructor()
    if (BetterSqlite) {
      try {
        return new BetterSqliteClient(new BetterSqlite(source))
      } catch {
        // Fall through to node:sqlite when the optional native binding is unavailable.
      }
    }
  }

  if (Buffer.isBuffer(source)) {
    throw new Error('node:sqlite fallback does not support Buffer database sources')
  }

  const NodeSqlite = getNodeSqliteConstructor()
  return new NodeSqliteClient(new NodeSqlite(source))
}
