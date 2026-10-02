import type { Attempt, RunSnapshot } from '../../../shared/protocol'
import type { Database } from './database'

export class RunStore {
  constructor(
    private db: Database,
    private runId: string,
  ) {
    db.query('CREATE TABLE IF NOT EXISTS run_state (id TEXT PRIMARY KEY, document TEXT NOT NULL)')
    db.query(
      'CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, match_id TEXT NOT NULL, created_at INTEGER NOT NULL, document TEXT NOT NULL)',
    )
    db.query(
      'CREATE INDEX IF NOT EXISTS attempts_by_match ON attempts(run_id, match_id, created_at)',
    )
  }

  read(): RunSnapshot | null {
    const row = this.db.query<{ document: string }>(
      'SELECT document FROM run_state WHERE id = ?',
      this.runId,
    )[0]
    return row ? JSON.parse(row.document) : null
  }

  commit(run: RunSnapshot, attempt?: Attempt) {
    this.db.transaction(() => {
      this.db.query(
        'INSERT INTO run_state(id, document) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET document = excluded.document',
        this.runId,
        JSON.stringify(run),
      )
      if (attempt)
        this.db.query(
          'INSERT INTO attempts(id, run_id, match_id, created_at, document) VALUES (?, ?, ?, ?, ?)',
          attempt.id,
          this.runId,
          attempt.matchId,
          attempt.createdAt,
          JSON.stringify(attempt),
        )
    })
  }

  attempts(matchId?: string): Attempt[] {
    const rows = matchId
      ? this.db.query<{ document: string }>(
          'SELECT document FROM attempts WHERE run_id = ? AND match_id = ? ORDER BY created_at, rowid',
          this.runId,
          matchId,
        )
      : this.db.query<{ document: string }>(
          'SELECT document FROM attempts WHERE run_id = ? ORDER BY created_at, rowid',
          this.runId,
        )
    return rows.map((row) => JSON.parse(row.document))
  }

  captureExport() {
    return this.db.transaction(() => ({
      run: this.read(),
      cutoff:
        this.db.query<{ last: number | null }>(
          'SELECT MAX(rowid) AS last FROM attempts WHERE run_id = ?',
          this.runId,
        )[0].last ?? 0,
    }))
  }

  *serializedAttempts(cutoff: number): Generator<string> {
    let cursor = 0
    while (true) {
      const rows = this.db.query<{ sequence: number; document: string }>(
        'SELECT rowid AS sequence, document FROM attempts WHERE run_id = ? AND rowid > ? AND rowid <= ? ORDER BY rowid LIMIT 32',
        this.runId,
        cursor,
        cutoff,
      )
      if (!rows.length) return
      for (const row of rows) {
        cursor = row.sequence
        yield row.document
      }
    }
  }
}
