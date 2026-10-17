import type { ArenaQuery, HistoryQuery, LeaderboardPage, HistoryPage } from '../../../shared/arena'
import type {
  Attempt,
  Health,
  ModelInfo,
  RunConfig,
  RunSnapshot,
  RunSummary,
} from '../../../shared/protocol'

export interface Platform {
  health: Health
  adminToken?: string
  listModels(): Promise<ModelInfo[]>
  listRuns(): Promise<RunSummary[]>
  leaderboard(query: ArenaQuery): Promise<LeaderboardPage>
  history(query: HistoryQuery): Promise<HistoryPage>
  createRun(id: string, config: RunConfig): Promise<RunSnapshot>
  getRun(id: string): Promise<RunSnapshot | null>
  command(id: string, action: 'pause' | 'resume' | 'cancel'): Promise<RunSnapshot>
  attempts(id: string, matchId?: string): Promise<Attempt[]>
  live?(id: string, request: Request): Promise<Response>
  exportRun(id: string): Promise<Response>
}
