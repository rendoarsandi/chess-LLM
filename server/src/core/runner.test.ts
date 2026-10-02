import { afterEach, describe, expect, it } from 'vitest'
import { BenchmarkRunner } from './runner'
import { ProviderError, type Completion, type ModelProvider } from './provider'
import { chessAdapter } from '../games/chess'
import { NodeDatabase } from '../storage/node-database'
import { RunStore } from '../storage/run-store'
import { standings, type LiveEvent, type ModelInfo, type RunConfig } from '../../../shared/protocol'

const models: ModelInfo[] = ['a', 'b', 'c'].map((id) => ({
  id: `fixture/${id}`,
  name: `Fixture ${id}`,
  contextLength: 32000,
  inputPrice: 0.000001,
  outputPrice: 0.000002,
  requestPrice: 0,
}))
const config: RunConfig = {
  name: 'Fixture run',
  gameId: 'chess',
  modelIds: models.slice(0, 2).map((model) => model.id),
  models: models.slice(0, 2),
  protocolVersion: 'chess-san-v1',
  repetitions: 1,
  temperature: 0.1,
  maxTokens: 1024,
  maxPlies: 160,
  maxAttempts: 2,
  timeoutMs: 45000,
  budgetUsd: 2,
}
const completion = (action: string): Completion => ({
  text: JSON.stringify({ action, explanation: 'Fixture explanation' }),
  reasoning: 'Fixture reasoning',
  inputTokens: 20,
  outputTokens: 10,
  costUsd: 0.001,
  costEstimated: false,
  provider: 'fixture',
  responseModel: 'fixture/a',
  generationId: 'fixture-generation',
})
const databases: NodeDatabase[] = []

function fixture(responses: (string | Error | Completion)[], options: Partial<RunConfig> = {}) {
  const db = new NodeDatabase(':memory:')
  databases.push(db)
  const store = new RunStore(db, 'test')
  let calls = 0
  const provider: ModelProvider = {
    async listModels() {
      return models
    },
    async complete() {
      const response = responses[calls++]
      if (response instanceof Error) throw response
      if (!response) throw new Error('Fixture exhausted')
      return typeof response === 'string' ? completion(response) : response
    },
  }
  const runner = new BenchmarkRunner(store, chessAdapter, provider)
  runner.create('test', { ...config, ...options })
  return { store, runner, provider, calls: () => calls }
}
afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

describe('benchmark execution through persisted chess games', () => {
  it('plays every pair in both colors and produces scored, measured results without spectators', async () => {
    const { runner, store } = fixture(['f3', 'e5', 'g4', 'Qh4#', 'f3', 'e5', 'g4', 'Qh4#'])
    for (let i = 0; i < 8; i++) await runner.tick()
    const run = store.read()!
    expect(run.status).toBe('completed')
    expect(run.matches.map((match) => match.modelIds)).toEqual([
      ['fixture/a', 'fixture/b'],
      ['fixture/b', 'fixture/a'],
    ])
    expect(run.matches.map((match) => match.result)).toEqual([
      { scores: [0, 1], reason: 'checkmate' },
      { scores: [0, 1], reason: 'checkmate' },
    ])
    expect(
      standings(run).map((row) => [
        row.games,
        row.wins,
        row.losses,
        row.points,
        row.requests,
        row.legalActions,
      ]),
    ).toEqual([
      [2, 1, 1, 1, 4, 4],
      [2, 1, 1, 1, 4, 4],
    ])
    expect(store.attempts()).toHaveLength(8)
    expect(store.attempts()[0]).toMatchObject({
      action: 'f3',
      outcome: 'legal',
      reasoning: 'Fixture reasoning',
      inputTokens: 20,
      outputTokens: 10,
      costUsd: 0.001,
    })
  })

  it('restores move history after a restart so repetition is adjudicated correctly', async () => {
    const { runner, store, provider } = fixture([
      'Nf3',
      'Nf6',
      'Ng1',
      'Ng8',
      'Nf3',
      'Nf6',
      'Ng1',
      'Ng8',
    ])
    for (let i = 0; i < 4; i++) await runner.tick()
    const restarted = new BenchmarkRunner(store, chessAdapter, provider)
    for (let i = 0; i < 4; i++) await restarted.tick()
    expect(store.read()!.matches[0]).toMatchObject({
      plies: 8,
      status: 'completed',
      result: { scores: [0.5, 0.5], reason: 'threefold_repetition' },
    })
  })

  it('bounds invalid-action retries and forfeits the offending model without inventing a legal move', async () => {
    const { runner, store } = fixture(['e5', 'not a move'])
    await runner.tick()
    await runner.tick()
    const match = store.read()!.matches[0]
    expect(match).toMatchObject({
      plies: 0,
      status: 'completed',
      result: { scores: [0, 1], reason: 'invalid_action_forfeit' },
    })
    expect(match.metrics[0]).toMatchObject({
      requests: 2,
      invalidActions: 2,
      legalActions: 0,
      costUsd: 0.002,
    })
  })

  it('pauses infrastructure failures without turning them into wins or losses', async () => {
    const { runner, store } = fixture([new ProviderError('Rate limited')])
    await runner.tick()
    expect(store.read()).toMatchObject({ status: 'paused', message: 'Rate limited' })
    expect(standings(store.read()!).map((row) => row.games)).toEqual([0, 0])
    expect(store.attempts()[0]).toMatchObject({ outcome: 'provider_error', costEstimated: true })
  })

  it('forfeits a timeout only after the configured attempt limit', async () => {
    const { runner, store } = fixture([
      new ProviderError('Timed out', 'timeout'),
      new ProviderError('Timed out', 'timeout'),
    ])
    await runner.tick()
    expect(store.read()!.matches[0].result).toBeNull()
    await runner.tick()
    expect(store.read()!.matches[0].result).toEqual({ scores: [0, 1], reason: 'timeout_forfeit' })
  })

  it('does not send a request that cannot fit inside the saved spend limit', async () => {
    const { runner, store, calls } = fixture(['e4'], {
      budgetUsd: 0.01,
      models: models.slice(0, 2).map((model) => ({ ...model, outputPrice: 1 })),
    })
    await runner.tick()
    expect(calls()).toBe(0)
    expect(store.read()).toMatchObject({
      status: 'completed',
      message: expect.stringContaining('Spend limit'),
    })
    expect(standings(store.read()!).map((row) => row.games)).toEqual([0, 0])
  })

  it('ends bounded matches as draws and excludes cancellation from scores', async () => {
    const { runner, store } = fixture(['e4', 'e5'], { maxPlies: 2 })
    await runner.tick()
    await runner.tick()
    runner.command('cancel')
    expect(store.read()!.matches.map((match) => match.status)).toEqual(['completed', 'cancelled'])
    expect(store.read()!.matches[0].result).toEqual({ scores: [0.5, 0.5], reason: 'move_limit' })
    expect(standings(store.read()!).map((row) => [row.games, row.points])).toEqual([
      [1, 0.5],
      [1, 0.5],
    ])
  })

  it('streams progress, collapses overlapping ticks, and honors a pause during inference while retaining billing', async () => {
    const { store } = fixture([])
    let resolve!: (value: Completion) => void
    let calls = 0
    const events: LiveEvent[] = []
    const provider: ModelProvider = {
      async listModels() {
        return models
      },
      complete(_model, _prompt, _config, progress) {
        calls++
        progress?.('', 'Considering the center.')
        return new Promise((done) => {
          resolve = done
        })
      },
    }
    const runner = new BenchmarkRunner(store, chessAdapter, provider, (event) => events.push(event))
    const pending = runner.tick(),
      overlapping = runner.tick()
    runner.command('pause')
    resolve(completion('e4'))
    await Promise.all([pending, overlapping])
    expect(calls).toBe(1)
    expect(events.at(-1)).toMatchObject({ type: 'thinking', reasoning: 'Considering the center.' })
    expect(store.read()).toMatchObject({ status: 'paused', pending: null })
    expect(store.read()!.matches[0]).toMatchObject({
      plies: 0,
      metrics: [{ requests: 1, legalActions: 0, costUsd: 0.001 }, {}],
    })
    expect(store.attempts()[0].outcome).toBe('discarded')
  })

  it('pauses an interrupted paid request on rehydration instead of automatically charging again', async () => {
    const { store } = fixture([])
    let resolve!: (value: Completion) => void
    let calls = 0
    const provider: ModelProvider = {
      async listModels() {
        return models
      },
      complete() {
        calls++
        return new Promise((done) => {
          resolve = done
        })
      },
    }
    const original = new BenchmarkRunner(store, chessAdapter, provider)
    const pending = original.tick()
    const rejection = expect(pending).rejects.toThrow('no longer owns')
    await new BenchmarkRunner(store, chessAdapter, provider).tick()
    expect(calls).toBe(1)
    expect(store.read()).toMatchObject({ status: 'paused', pending: null })
    expect(store.attempts()[0]).toMatchObject({ outcome: 'interrupted', costEstimated: true })
    resolve(completion('e4'))
    await rejection
  })
})
