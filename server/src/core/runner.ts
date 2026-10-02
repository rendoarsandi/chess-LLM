import {
  emptyMetrics,
  summarize,
  type Attempt,
  type LiveEvent,
  type Match,
  type RunConfig,
  type RunSnapshot,
} from '../../../shared/protocol'
import type { GameAdapter } from './game'
import { ProviderError, requestReserve, type ModelProvider } from './provider'
import { RunStore } from '../storage/run-store'

export class RunConflict extends Error {}

export class BenchmarkRunner {
  private inFlight: Promise<void> | null = null

  constructor(
    private store: RunStore,
    private adapter: GameAdapter,
    private provider: ModelProvider,
    private emit?: (event: LiveEvent) => void,
  ) {}

  create(id: string, config: RunConfig): RunSnapshot {
    const existing = this.store.read()
    if (existing) {
      if (JSON.stringify(existing.config) !== JSON.stringify(config))
        throw new RunConflict('This request ID belongs to another run.')
      return existing
    }
    const initialState = this.adapter.initialState()
    const observation = this.adapter.observe(initialState)
    const matches: Match[] = []
    for (let repeat = 0; repeat < config.repetitions; repeat++) {
      for (let a = 0; a < config.modelIds.length; a++) {
        for (let b = a + 1; b < config.modelIds.length; b++) {
          for (const modelIds of [
            [config.modelIds[a], config.modelIds[b]],
            [config.modelIds[b], config.modelIds[a]],
          ] as [string, string][]) {
            matches.push({
              id: `${id}-${matches.length + 1}`,
              modelIds,
              status: 'queued',
              state: initialState,
              view: observation.view,
              turn: observation.turn,
              plies: 0,
              attemptsThisTurn: 0,
              metrics: [emptyMetrics(), emptyMetrics()],
              result: null,
            })
          }
        }
      }
    }
    const now = Date.now()
    const run: RunSnapshot = {
      id,
      config,
      matches,
      status: 'running',
      createdAt: now,
      updatedAt: now,
      message: null,
      pending: null,
    }
    this.store.commit(run)
    return run
  }

  command(action: 'pause' | 'resume' | 'cancel'): RunSnapshot {
    const run = this.required()
    if (run.status === 'completed' || run.status === 'cancelled')
      throw new RunConflict('This run has finished.')
    if (action === 'cancel') {
      run.status = 'cancelled'
      run.message = 'Run stopped by the operator. Unfinished matches are excluded from scores.'
      for (const match of run.matches) if (match.status !== 'completed') match.status = 'cancelled'
    } else {
      run.status = action === 'pause' ? 'paused' : 'running'
      run.message = action === 'pause' ? 'Paused by the operator.' : null
    }
    run.updatedAt = Date.now()
    this.store.commit(run)
    return run
  }

  tick(): Promise<void> {
    if (this.inFlight) return this.inFlight
    this.inFlight = this.advance().finally(() => {
      this.inFlight = null
    })
    return this.inFlight
  }

  private required() {
    const run = this.store.read()
    if (!run) throw new RunConflict('Run not found.')
    return run
  }

  private async advance() {
    let run = this.required()
    // A persisted request without a live promise means the process was interrupted.
    // Pause rather than silently repeating a potentially billed request.
    if (run.pending) {
      const pending = run.pending
      const match = run.matches.find((item) => item.id === pending.matchId)!
      const metrics = match.metrics[pending.seat]
      metrics.requests++
      metrics.errors++
      metrics.costUsd += pending.reservedCostUsd
      metrics.estimatedCosts++
      const attempt: Attempt = {
        ...pending,
        modelId: match.modelIds[pending.seat],
        attempt: match.attemptsThisTurn + 1,
        action: null,
        explanation: null,
        reasoning: null,
        response: null,
        outcome: 'interrupted',
        error:
          'The process stopped during inference. Actual usage is unknown; the request reserve is recorded as estimated cost.',
        inputTokens: 0,
        outputTokens: 0,
        costUsd: pending.reservedCostUsd,
        costEstimated: true,
        latencyMs: 0,
        createdAt: pending.startedAt,
        positionAfter: null,
        provider: null,
        responseModel: null,
        generationId: null,
      }
      run.pending = null
      if (run.status !== 'cancelled') {
        run.status = 'paused'
        run.message =
          'An inference request was interrupted. Check the recorded estimated cost, then resume.'
      }
      run.updatedAt = Date.now()
      this.store.commit(run, attempt)
      return
    }
    if (run.status !== 'running') return
    const match = run.matches.find((item) => item.status === 'running' || item.status === 'queued')
    if (!match) {
      run.status = 'completed'
      run.updatedAt = Date.now()
      this.store.commit(run)
      return
    }
    match.status = 'running'
    const observation = this.adapter.observe(match.state)
    const seat = observation.turn
    const model = run.config.models.find((item) => item.id === match.modelIds[seat])!
    let prompt = observation.prompt
    if (match.attemptsThisTurn > 0) {
      prompt += `\nYour last attempt failed. Use the current legal actions and return the requested JSON. Attempt ${match.attemptsThisTurn + 1} of ${run.config.maxAttempts}.`
    }
    const reserve = requestReserve(model, prompt, run.config.maxTokens)
    if (summarize(run).costUsd + reserve > run.config.budgetUsd) {
      run.status = 'completed'
      run.message = 'Spend limit reached. Unfinished matches are excluded from scores.'
      for (const item of run.matches) if (item.status !== 'completed') item.status = 'cancelled'
      run.updatedAt = Date.now()
      this.store.commit(run)
      return
    }
    const pending = {
      id: crypto.randomUUID(),
      matchId: match.id,
      seat,
      ply: match.plies,
      startedAt: Date.now(),
      reservedCostUsd: reserve,
    }
    run.pending = pending
    run.updatedAt = Date.now()
    this.store.commit(run)
    const attempt: Attempt = {
      id: pending.id,
      matchId: match.id,
      modelId: model.id,
      seat,
      ply: match.plies,
      attempt: match.attemptsThisTurn + 1,
      action: null,
      explanation: null,
      reasoning: null,
      response: null,
      outcome: 'invalid',
      error: null,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      costEstimated: false,
      latencyMs: 0,
      createdAt: pending.startedAt,
      positionAfter: null,
      provider: null,
      responseModel: null,
      generationId: null,
    }
    try {
      const progress = (text: string, reasoning: string) => {
        this.emit?.({
          type: 'thinking',
          runId: run.id,
          matchId: match.id,
          requestId: pending.id,
          seat,
          startedAt: pending.startedAt,
          text,
          reasoning,
        })
      }
      progress('', '')
      const completion = await this.provider.complete(model, prompt, run.config, progress)
      Object.assign(attempt, {
        response: completion.text.slice(0, 32000),
        reasoning: completion.reasoning?.slice(0, 32000) ?? null,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        costUsd: completion.costUsd,
        costEstimated: completion.costEstimated,
        provider: completion.provider,
        responseModel: completion.responseModel,
        generationId: completion.generationId,
      })
      try {
        const text = completion.text
          .trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, '')
        const data = JSON.parse(text)
        if (typeof data.action !== 'string' || !observation.legalActions.includes(data.action)) {
          throw new Error('Response did not contain an action from the legal action list.')
        }
        attempt.action = data.action
        attempt.explanation =
          typeof data.explanation === 'string' ? data.explanation.slice(0, 4000) : null
        attempt.outcome = 'legal'
      } catch {
        attempt.error = 'Invalid JSON or illegal action.'
      }
    } catch (error) {
      attempt.outcome = error instanceof ProviderError ? error.kind : 'provider_error'
      attempt.error =
        error instanceof ProviderError
          ? error.message
          : 'Inference service unavailable. Check the server logs and resume.'
      // Failed transports can still have been billed upstream. Reserve conservatively.
      attempt.costUsd = reserve
      attempt.costEstimated = true
    }
    attempt.latencyMs = Date.now() - pending.startedAt
    // Re-read after the network call so an operator's pause/cancel wins.
    run = this.required()
    const current = run.matches.find((item) => item.id === match.id)!
    if (run.pending?.id !== pending.id)
      throw new RunConflict('Inference request no longer owns this turn.')
    run.pending = null
    const metrics = current.metrics[seat]
    metrics.requests++
    metrics.inputTokens += attempt.inputTokens
    metrics.outputTokens += attempt.outputTokens
    metrics.costUsd += attempt.costUsd
    metrics.estimatedCosts += attempt.costEstimated ? 1 : 0
    metrics.latencyMs += attempt.latencyMs
    if (attempt.outcome === 'invalid') metrics.invalidActions++
    else if (attempt.outcome === 'timeout' || attempt.outcome === 'provider_error') metrics.errors++

    if (run.status !== 'running' || current.plies !== pending.ply) {
      attempt.outcome = 'discarded'
    } else if (attempt.outcome === 'provider_error') {
      run.status = 'paused'
      run.message = attempt.error
    } else if (attempt.outcome === 'legal') {
      const next = this.adapter.apply(current.state, attempt.action!)
      current.state = next.state
      const view = this.adapter.observe(next.state)
      current.view = view.view
      current.turn = view.turn
      current.plies++
      current.attemptsThisTurn = 0
      current.result = next.result
      metrics.legalActions++
      attempt.positionAfter = view.view.fen ?? next.state
      if (!current.result && current.plies >= run.config.maxPlies) {
        current.result = { scores: [0.5, 0.5], reason: 'move_limit' }
      }
      if (current.result) current.status = 'completed'
    } else {
      current.attemptsThisTurn++
      if (current.attemptsThisTurn >= run.config.maxAttempts) {
        current.status = 'completed'
        current.result = {
          scores: seat === 0 ? [0, 1] : [1, 0],
          reason: attempt.outcome === 'timeout' ? 'timeout_forfeit' : 'invalid_action_forfeit',
        }
      }
    }
    if (run.status === 'running' && run.matches.every((item) => item.status === 'completed'))
      run.status = 'completed'
    run.updatedAt = Date.now()
    this.store.commit(run, attempt)
  }
}
