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
  createRun(id: string, config: RunConfig): Promise<RunSnapshot>
  getRun(id: string): Promise<RunSnapshot | null>
  command(id: string, action: 'pause' | 'resume' | 'cancel'): Promise<RunSnapshot>
  attempts(id: string, matchId?: string): Promise<Attempt[]>
  live?(id: string, request: Request): Promise<Response>
  exportRun(id: string): Promise<Response>
}
