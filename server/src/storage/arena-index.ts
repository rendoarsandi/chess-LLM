import { emptyMetrics, summarize, type RunSnapshot } from '../../../shared/protocol'
import type {
  ArenaQuery,
  HistoryQuery,
  HistoricalMatch,
  GlobalStanding,
  HistoryPage,
  LeaderboardPage,
} from '../../../shared/arena'
import type { Database, SqlValue } from './database'

const metricNames = Object.keys(emptyMetrics())
const scoreFilter = "status = 'completed' AND white_score IS NOT NULL"

export class ArenaIndex {
  constructor(private db: Database) {
    db.query(
      'CREATE TABLE IF NOT EXISTS arena_indexed_runs (run_id TEXT PRIMARY KEY, updated_at INTEGER NOT NULL, unavailable INTEGER NOT NULL DEFAULT 0)',
    )
    db.query(
      'CREATE TABLE IF NOT EXISTS arena_models (id TEXT PRIMARY KEY, name TEXT NOT NULL, updated_at INTEGER NOT NULL)',
    )
    db.query(
      'CREATE TABLE IF NOT EXISTS arena_matches (run_id TEXT NOT NULL, match_id TEXT NOT NULL, created_at INTEGER NOT NULL, game_id TEXT NOT NULL, protocol TEXT NOT NULL, white_model TEXT NOT NULL, black_model TEXT NOT NULL, status TEXT NOT NULL, white_score REAL, black_score REAL, document TEXT NOT NULL, PRIMARY KEY(run_id, match_id))',
    )
    db.query(
      'CREATE INDEX IF NOT EXISTS arena_by_date ON arena_matches(created_at DESC, run_id, match_id)',
    )
    db.query(
      'CREATE INDEX IF NOT EXISTS arena_by_pair ON arena_matches(white_model, black_model, created_at DESC)',
    )
    db.query(
      'CREATE INDEX IF NOT EXISTS arena_by_protocol ON arena_matches(game_id, protocol, status)',
    )
  }

  index(run: RunSnapshot) {
    this.db.transaction(() => {
      const current = this.db.query<{ updated_at: number }>(
        'SELECT updated_at FROM runs WHERE id = ?',
        run.id,
      )[0]
      if (current && current.updated_at > run.updatedAt) return
      this.db.query(
        'INSERT INTO runs(id, created_at, updated_at, document) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, document = excluded.document',
        run.id,
        run.createdAt,
        run.updatedAt,
        JSON.stringify(summarize(run)),
      )
      for (const model of run.config.models)
        this.db.query(
          'INSERT INTO arena_models(id, name, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at WHERE excluded.updated_at >= arena_models.updated_at',
          model.id,
          model.name,
          run.updatedAt,
        )
      const previous = new Map(
        this.db
          .query<{ match_id: string; document: string }>(
            'SELECT match_id, document FROM arena_matches WHERE run_id = ?',
            run.id,
          )
          .map((row) => [row.match_id, row.document]),
      )
      for (const match of run.matches) {
        const record: HistoricalMatch = {
          id: match.id,
          runId: run.id,
          runName: run.config.name,
          runStatus: run.status,
          createdAt: run.createdAt,
          gameId: run.config.gameId,
          protocol: run.config.protocolVersion,
          modelIds: match.modelIds,
          modelNames: match.modelIds.map(
            (id) => run.config.models.find((model) => model.id === id)?.name ?? id,
          ) as [string, string],
          status: match.status,
          result: match.result,
          plies: match.plies,
          metrics: match.metrics,
        }
        const document = JSON.stringify(record)
        if (previous.get(match.id) !== document)
          this.db.query(
            'INSERT INTO arena_matches(run_id, match_id, created_at, game_id, protocol, white_model, black_model, status, white_score, black_score, document) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(run_id, match_id) DO UPDATE SET status = excluded.status, white_score = excluded.white_score, black_score = excluded.black_score, document = excluded.document',
            run.id,
            match.id,
            run.createdAt,
            record.gameId,
            record.protocol,
            match.modelIds[0],
            match.modelIds[1],
            match.status,
            match.result?.scores[0] ?? null,
            match.result?.scores[1] ?? null,
            document,
          )
        previous.delete(match.id)
      }
      for (const id of previous.keys())
        this.db.query('DELETE FROM arena_matches WHERE run_id = ? AND match_id = ?', run.id, id)
      this.db.query(
        'INSERT INTO arena_indexed_runs(run_id, updated_at, unavailable) VALUES (?, ?, 0) ON CONFLICT(run_id) DO UPDATE SET updated_at = excluded.updated_at, unavailable = 0',
        run.id,
        run.updatedAt,
      )
    })
  }

  pending(limit = 10) {
    return this.db
      .query<{ id: string }>(
        'SELECT r.id FROM runs r LEFT JOIN arena_indexed_runs i ON i.run_id = r.id WHERE i.run_id IS NULL OR i.updated_at < r.updated_at ORDER BY r.created_at, r.id LIMIT ?',
        limit,
      )
      .map((row) => row.id)
  }
  unavailable(id: string) {
    this.db.query(
      'INSERT INTO arena_indexed_runs(run_id, updated_at, unavailable) SELECT id, updated_at, 1 FROM runs WHERE id = ? ON CONFLICT(run_id) DO UPDATE SET updated_at = excluded.updated_at, unavailable = 1',
      id,
    )
  }
  coverage() {
    const row = this.db.query<{
      totalRuns: number
      indexedRuns: number
      unavailableRuns: number
      pending: number
    }>(
      'SELECT COUNT(*) totalRuns, COALESCE(SUM(i.run_id IS NOT NULL AND i.unavailable = 0 AND i.updated_at >= r.updated_at), 0) indexedRuns, COALESCE(SUM(i.unavailable = 1), 0) unavailableRuns, COALESCE(SUM(i.run_id IS NULL OR i.updated_at < r.updated_at), 0) pending FROM runs r LEFT JOIN arena_indexed_runs i ON r.id = i.run_id',
    )[0]
    return {
      totalRuns: row.totalRuns,
      indexedRuns: row.indexedRuns,
      unavailableRuns: row.unavailableRuns,
      indexing: row.pending > 0,
    }
  }
  private options() {
    return {
      models: this.db.query<{ id: string; name: string }>(
        'SELECT id, name FROM arena_models ORDER BY name, id',
      ),
      protocols: this.db.query<{ gameId: string; protocol: string }>(
        'SELECT DISTINCT game_id gameId, protocol FROM arena_matches ORDER BY game_id, protocol',
      ),
    }
  }
  private filter(query: ArenaQuery) {
    const clauses: string[] = [],
      values: SqlValue[] = []
    if (query.gameId) {
      clauses.push('game_id = ?')
      values.push(query.gameId)
    }
    if (query.protocol) {
      clauses.push('protocol = ?')
      values.push(query.protocol)
    }
    return { clauses, values }
  }
  leaderboard(query: ArenaQuery = {}): LeaderboardPage {
    const { clauses, values } = this.filter(query)
    const where = [scoreFilter, ...clauses].join(' AND ')
    const seats = [0, 1]
      .map(
        (seat) =>
          `SELECT run_id, ${seat === 0 ? 'white_model' : 'black_model'} model_id, ${seat === 0 ? 'white_score' : 'black_score'} score, ${metricNames.map((key) => `json_extract(document, '$.metrics[${seat}].${key}') ${key}`).join(', ')} FROM arena_matches WHERE ${where}`,
      )
      .join(' UNION ALL ')
    const search = query.search?.trim()
    const escaped = search?.replace(/[\\%_]/g, '\\$&')
    const searchWhere = search
      ? "WHERE (m.name LIKE ? ESCAPE '\\' OR s.model_id LIKE ? ESCAPE '\\')"
      : ''
    const searchValues: SqlValue[] = escaped ? [`%${escaped}%`, `%${escaped}%`] : []
    const aggregate = `WITH seats AS (${seats}) SELECT s.model_id modelId, m.name, COUNT(*) games, COUNT(DISTINCT run_id) runs, SUM(score = 1) wins, SUM(score = 0.5) draws, SUM(score = 0) losses, SUM(score) points, ${metricNames.map((key) => `SUM(s.${key}) ${key}`).join(', ')} FROM seats s JOIN arena_models m ON m.id = s.model_id ${searchWhere} GROUP BY s.model_id, m.name`
    const parameters = [...values, ...values, ...searchValues]
    const total = this.db.query<{ total: number }>(
      `SELECT COUNT(*) total FROM (${aggregate})`,
      ...parameters,
    )[0].total
    const pageSize = 50,
      page = Math.min(Math.max(1, query.page ?? 1), Math.max(1, Math.ceil(total / pageSize)))
    const rows = this.db.query<GlobalStanding>(
      `${aggregate} ORDER BY points * 1.0 / games DESC, games DESC, name, modelId LIMIT ? OFFSET ?`,
      ...parameters,
      pageSize,
      (page - 1) * pageSize,
    )
    return { rows, total, page, pageSize, coverage: this.coverage(), ...this.options() }
  }
  history(query: HistoryQuery = {}): HistoryPage {
    const { clauses, values } = this.filter(query)
    if (query.modelA && query.modelB) {
      clauses.push(
        '((white_model = ? AND black_model = ?) OR (white_model = ? AND black_model = ?))',
      )
      values.push(query.modelA, query.modelB, query.modelB, query.modelA)
    } else if (query.modelA || query.modelB) {
      clauses.push('(white_model = ? OR black_model = ?)')
      values.push(query.modelA || query.modelB!, query.modelA || query.modelB!)
    }
    if (query.status && query.status !== 'all') {
      clauses.push('status = ?')
      values.push(query.status)
    }
    const where = clauses.length ? clauses.join(' AND ') : '1 = 1'
    const total = this.db.query<{ total: number }>(
      `SELECT COUNT(*) total FROM arena_matches WHERE ${where}`,
      ...values,
    )[0].total
    const pageSize = 25,
      page = Math.min(Math.max(1, query.page ?? 1), Math.max(1, Math.ceil(total / pageSize)))
    const matches = this.db
      .query<{ document: string }>(
        `SELECT document FROM arena_matches WHERE ${where} ORDER BY created_at DESC, run_id DESC, match_id LIMIT ? OFFSET ?`,
        ...values,
        pageSize,
        (page - 1) * pageSize,
      )
      .map((row) => JSON.parse(row.document) as HistoricalMatch)
    const headToHead =
      query.modelA && query.modelB
        ? this.db.query<NonNullable<HistoryPage['headToHead']>>(
            `SELECT COUNT(*) games, COALESCE(SUM(CASE WHEN white_model = ? THEN white_score = 1 ELSE black_score = 1 END), 0) aWins, COALESCE(SUM(white_score = 0.5), 0) draws, COALESCE(SUM(CASE WHEN white_model = ? THEN white_score = 0 ELSE black_score = 0 END), 0) bWins FROM arena_matches WHERE ${where} AND ${scoreFilter}`,
            query.modelA,
            query.modelA,
            ...values,
          )[0]
        : null
    return {
      matches,
      total,
      page,
      pageSize,
      headToHead,
      coverage: this.coverage(),
      ...this.options(),
    }
  }
}
