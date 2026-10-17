import { afterEach, expect, it } from 'vitest'
import { LocalPlatform } from '../local-platform'
import { BenchmarkRunner } from '../core/runner'
import type { ModelProvider } from '../core/provider'
import { chessAdapter } from '../games/chess'
import { NodeDatabase } from './node-database'
import { Registry } from './registry'
import { RunStore } from './run-store'
import { summarize, type RunConfig } from '../../../shared/protocol'

const config: RunConfig = {
  name: 'Saved arena experiment',
  gameId: 'chess',
  protocolVersion: 'chess-san-v1',
  modelIds: ['fixture/a', 'fixture/b'],
  models: ['a', 'b'].map((id) => ({
    id: `fixture/${id}`,
    name: `Fixture ${id}`,
    contextLength: 32000,
    inputPrice: 0,
    outputPrice: 0,
    requestPrice: 0,
  })),
  repetitions: 1,
  temperature: 0.1,
  maxTokens: 128,
  maxPlies: 160,
  maxAttempts: 1,
  timeoutMs: 5000,
  budgetUsd: 1,
}
const provider: ModelProvider = {
  async listModels() {
    return config.models
  },
  async complete(_model, prompt) {
    const fen = prompt.match(/FEN: ([^\n]+)/)![1].split(' ')
    const ply = (Number(fen[5]) - 1) * 2 + (fen[1] === 'b' ? 1 : 0)
    return {
      text: JSON.stringify({ action: ['f3', 'e5', 'g4', 'Qh4#'][ply] }),
      inputTokens: 10,
      outputTokens: 5,
      costUsd: 0.001,
      costEstimated: true,
      provider: null,
      responseModel: null,
      generationId: null,
    }
  },
}
const databases: NodeDatabase[] = []
function database() {
  const db = new NodeDatabase(':memory:')
  databases.push(db)
  return db
}
afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

it('aggregates saved games across runs, survives duplicate/stale publications, and combines both colors', async () => {
  const db = database(),
    platform = new LocalPlatform(db, provider),
    registry = new Registry(db)
  await platform.createRun('first', config)
  const stale = (await platform.getRun('first'))!
  // Make the old version unambiguously earlier than the completed snapshot.
  stale.updatedAt = 0
  for (let i = 0; i < 8; i++) await platform.tickRun('first')
  const completed = (await platform.getRun('first'))!
  registry.arena.index(completed)
  registry.arena.index(stale)
  await platform.createRun('stopped', config)
  for (let i = 0; i < 4; i++) await platform.tickRun('stopped')
  await platform.command('stopped', 'cancel')
  const board = await platform.leaderboard({ gameId: 'chess' })
  expect(
    board.rows.map((row) => [
      row.modelId,
      row.games,
      row.points,
      row.runs,
      row.requests,
      row.inputTokens,
      row.estimatedCosts,
    ]),
  ).toEqual([
    ['fixture/b', 3, 2, 2, 6, 60, 6],
    ['fixture/a', 3, 1, 2, 6, 60, 6],
  ])
  expect(board.rows[0].costUsd).toBeCloseTo(0.006)
  const history = await platform.history({ modelA: 'fixture/a', modelB: 'fixture/b' })
  expect(history.total).toBe(4)
  expect(history.headToHead).toEqual({ games: 3, aWins: 1, draws: 0, bWins: 2 })
  expect(
    history.matches.filter((match) => match.status === 'completed').map((match) => match.plies),
  ).toEqual([4, 4, 4])
  expect((await platform.history({ modelA: 'fixture/b', modelB: 'fixture/a' })).headToHead).toEqual(
    { games: 3, aWins: 2, draws: 0, bWins: 1 },
  )
  expect((await platform.history({ status: 'cancelled' })).matches).toHaveLength(1)
  expect((await platform.history({ modelA: 'missing' })).total).toBe(0)
  expect((await platform.leaderboard({ protocol: 'other' })).rows).toEqual([])
  expect((await platform.leaderboard({ search: 'Fixture b' })).rows[0].modelId).toBe('fixture/b')
  expect((await platform.leaderboard({ search: '%' })).total).toBe(0)
})

it('backfills all legacy snapshots beyond the 200-run rail, paginates, and retains the index after restart', async () => {
  const db = database(),
    registry = new Registry(db),
    store = new RunStore(db, 'template')
  const runner = new BenchmarkRunner(store, chessAdapter, provider)
  runner.create('template', config)
  for (let i = 0; i < 8; i++) await runner.tick()
  const template = store.read()!
  for (let i = 0; i < 205; i++) {
    const id = `saved-${String(i).padStart(3, '0')}`
    const run = { ...template, id, createdAt: i + 1, updatedAt: i + 1000 }
    new RunStore(db, id).commit(run)
    registry.upsert(summarize(run))
  }
  // A legacy registry can also contain a run whose object no longer has state.
  registry.upsert({ ...summarize(template), id: 'missing' })
  expect(registry.list()).toHaveLength(200)
  const restored = new LocalPlatform(db, provider)
  const leaderboard = await restored.leaderboard({})
  expect(leaderboard.coverage).toEqual({
    totalRuns: 207,
    indexedRuns: 206,
    unavailableRuns: 1,
    indexing: false,
  })
  expect(leaderboard.rows.map((row) => [row.games, row.runs])).toEqual([
    [412, 206],
    [412, 206],
  ])
  const first = await restored.history({ page: 1 }),
    second = await restored.history({ page: 2 })
  expect(first.total).toBe(412)
  expect(first.matches).toHaveLength(25)
  expect(second.matches).toHaveLength(25)
  const keys = [...first.matches, ...second.matches].map((match) => `${match.runId}:${match.id}`)
  expect(new Set(keys).size).toBe(50)
  expect((await restored.history({ page: 1000000 })).page).toBe(17)
  expect((await new LocalPlatform(db, provider).leaderboard({})).rows).toEqual(leaderboard.rows)
})
