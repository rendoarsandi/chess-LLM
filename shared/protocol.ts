export type RunStatus = 'running' | 'paused' | 'completed' | 'cancelled'
export type MatchStatus = 'queued' | 'running' | 'completed' | 'cancelled'

export interface ModelInfo {
  id: string
  name: string
  contextLength: number
  inputPrice: number
  outputPrice: number
  requestPrice: number
}

export interface RunInput {
  name: string
  gameId: string
  modelIds: string[]
  repetitions: number
  temperature: number
  maxTokens: number
  maxPlies: number
  maxAttempts: number
  timeoutMs: number
  budgetUsd: number
}

export interface RunConfig extends RunInput {
  models: ModelInfo[]
  protocolVersion: string
}

export interface Metrics {
  requests: number
  legalActions: number
  invalidActions: number
  errors: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  estimatedCosts: number
  latencyMs: number
}

export interface MatchResult {
  scores: [number, number]
  reason: string
}

export interface Match {
  id: string
  modelIds: [string, string]
  status: MatchStatus
  state: string
  view: { kind: string; fen?: string }
  turn: number
  plies: number
  attemptsThisTurn: number
  metrics: [Metrics, Metrics]
  result: MatchResult | null
}

export interface PendingRequest {
  id: string
  matchId: string
  seat: number
  ply: number
  startedAt: number
  reservedCostUsd: number
}

export interface RunSnapshot {
  id: string
  config: RunConfig
  status: RunStatus
  createdAt: number
  updatedAt: number
  message: string | null
  matches: Match[]
  pending: PendingRequest | null
}

export interface RunSummary {
  id: string
  name: string
  gameId: string
  status: RunStatus
  modelNames: string[]
  completedMatches: number
  totalMatches: number
  costUsd: number
  createdAt: number
  updatedAt: number
}

export type AttemptOutcome =
  'legal' | 'invalid' | 'provider_error' | 'timeout' | 'discarded' | 'interrupted'

export interface Attempt {
  id: string
  matchId: string
  modelId: string
  seat: number
  ply: number
  attempt: number
  action: string | null
  explanation: string | null
  reasoning: string | null
  response: string | null
  outcome: AttemptOutcome
  error: string | null
  inputTokens: number
  outputTokens: number
  costUsd: number
  costEstimated: boolean
  latencyMs: number
  createdAt: number
  positionAfter: string | null
  provider: string | null
  responseModel: string | null
  generationId: string | null
}

export interface Standing extends Metrics {
  modelId: string
  name: string
  games: number
  wins: number
  draws: number
  losses: number
  points: number
}

export interface Health {
  providerConfigured: boolean
  adminConfigured: boolean
  runtime: 'cloudflare' | 'local'
}

export type LiveEvent =
  | { type: 'snapshot'; run: RunSnapshot }
  | {
      type: 'thinking'
      runId: string
      matchId: string
      requestId: string
      seat: number
      startedAt: number
      text: string
      reasoning: string
    }

export const emptyMetrics = (): Metrics => ({
  requests: 0,
  legalActions: 0,
  invalidActions: 0,
  errors: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  estimatedCosts: 0,
  latencyMs: 0,
})

export function summarize(run: RunSnapshot): RunSummary {
  return {
    id: run.id,
    name: run.config.name,
    gameId: run.config.gameId,
    status: run.status,
    modelNames: run.config.models.map((model) => model.name),
    completedMatches: run.matches.filter((match) => match.status === 'completed').length,
    totalMatches: run.matches.length,
    costUsd: run.matches.reduce(
      (total, match) => total + match.metrics[0].costUsd + match.metrics[1].costUsd,
      0,
    ),
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  }
}

export function standings(run: RunSnapshot): Standing[] {
  const rows = new Map(
    run.config.models.map((model) => [
      model.id,
      {
        ...emptyMetrics(),
        modelId: model.id,
        name: model.name,
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
      },
    ]),
  )
  for (const match of run.matches) {
    match.modelIds.forEach((id, seat) => {
      const row = rows.get(id)!
      const metrics = match.metrics[seat]
      for (const key of Object.keys(metrics) as (keyof Metrics)[]) row[key] += metrics[key]
      if (match.status === 'completed' && match.result) {
        const score = match.result.scores[seat]
        row.games++
        row.points += score
        if (score === 1) row.wins++
        else if (score === 0) row.losses++
        else row.draws++
      }
    })
  }
  return [...rows.values()].sort(
    (a, b) =>
      (b.games ? b.points / b.games : 0) - (a.games ? a.points / a.games : 0) ||
      a.name.localeCompare(b.name),
  )
}
