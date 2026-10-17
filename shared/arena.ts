import type { Match, RunStatus, Standing } from './protocol'

export interface ArenaQuery {
  gameId?: string
  protocol?: string
  page?: number
  search?: string
}
export interface HistoryQuery extends ArenaQuery {
  modelA?: string
  modelB?: string
  status?: Match['status'] | 'all'
}
export interface IndexCoverage {
  totalRuns: number
  indexedRuns: number
  unavailableRuns: number
  indexing: boolean
}
export interface ArenaModel {
  id: string
  name: string
}
export interface ArenaOptions {
  models: ArenaModel[]
  protocols: { gameId: string; protocol: string }[]
}
export interface GlobalStanding extends Standing {
  runs: number
}
export interface LeaderboardPage extends ArenaOptions {
  rows: GlobalStanding[]
  total: number
  page: number
  pageSize: number
  coverage: IndexCoverage
}
export interface HistoricalMatch {
  id: string
  runId: string
  runName: string
  runStatus: RunStatus
  createdAt: number
  gameId: string
  protocol: string
  modelIds: Match['modelIds']
  modelNames: [string, string]
  status: Match['status']
  result: Match['result']
  plies: number
  metrics: Match['metrics']
}
export interface HistoryPage extends ArenaOptions {
  matches: HistoricalMatch[]
  total: number
  page: number
  pageSize: number
  coverage: IndexCoverage
  headToHead: { games: number; aWins: number; draws: number; bWins: number } | null
}

export function arenaSearch(search: Record<string, unknown>): HistoryQuery {
  const result: HistoryQuery = { gameId: 'chess', page: 1 }
  for (const key of ['gameId', 'protocol', 'modelA', 'modelB', 'search'] as const) {
    if (typeof search[key] === 'string' && search[key].length <= 200 && search[key].trim())
      result[key] = search[key].trim()
  }
  const page = Number(search.page)
  if (Number.isSafeInteger(page) && page > 0 && page <= 1000000) result.page = page
  if (['all', 'completed', 'running', 'queued', 'cancelled'].includes(String(search.status)))
    result.status = search.status as HistoryQuery['status']
  if (result.modelA === result.modelB) delete result.modelB
  return result
}
