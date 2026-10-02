import type { RunSummary } from '../../../shared/protocol'
import type { Database } from './database'

export class Registry {
  constructor(private db: Database) {
    db.query(
      'CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, document TEXT NOT NULL)',
    )
  }

  upsert(run: RunSummary) {
    this.db.query(
      'INSERT INTO runs(id, created_at, updated_at, document) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, document = excluded.document WHERE excluded.updated_at >= runs.updated_at',
      run.id,
      run.createdAt,
      run.updatedAt,
      JSON.stringify(run),
    )
  }

  list(): RunSummary[] {
    return this.db
      .query<{ document: string }>('SELECT document FROM runs ORDER BY created_at DESC LIMIT 200')
      .map((row) => JSON.parse(row.document))
  }
}
