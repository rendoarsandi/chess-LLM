import type { ArenaQuery, HistoryQuery, LeaderboardPage, HistoryPage } from '../../../shared/arena'
import {
  type RunConfig,
  type RunSnapshot,
  type RunSummary,
  type Attempt,
} from '../../../shared/protocol'
import type { Platform } from '../core/platform'
import { RunConflict } from '../core/runner'
import { OpenRouterProvider } from '../providers/openrouter'
import type { WorkerEnv } from './env'

export class CloudflarePlatform implements Platform {
  health
  adminToken
  private provider: OpenRouterProvider
  constructor(private env: WorkerEnv) {
    this.health = {
      providerConfigured: !!env.OPENROUTER_API_KEY,
      adminConfigured: !!env.ADMIN_API_TOKEN,
      runtime: 'cloudflare' as const,
    }
    this.adminToken = env.ADMIN_API_TOKEN
    this.provider = new OpenRouterProvider(env)
  }
  listModels() {
    return this.provider.listModels()
  }
  async listRuns() {
    const response =
      await this.env.ARENA_REGISTRY.getByName('global').fetch('https://registry/runs')
    if (!response.ok) throw new Error('Registry unavailable')
    return (await response.json()) as RunSummary[]
  }
  async leaderboard(query: ArenaQuery): Promise<LeaderboardPage> {
    return this.arenaRequest('/leaderboard', query)
  }
  async history(query: HistoryQuery): Promise<HistoryPage> {
    return this.arenaRequest('/history', query)
  }
  private async arenaRequest<T>(path: string, query: ArenaQuery): Promise<T> {
    const params = new URLSearchParams(
      Object.entries(query)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)]),
    )
    const response = await this.env.ARENA_REGISTRY.getByName('global').fetch(
      `https://registry${path}?${params}`,
    )
    if (!response.ok) throw new Error('Arena results unavailable')
    return (await response.json()) as T
  }
  async createRun(id: string, config: RunConfig) {
    const run = await this.request<RunSnapshot>(id, '/initialize', {
      method: 'POST',
      body: JSON.stringify({ id, config }),
    })
    const response = await this.env.ARENA_REGISTRY.getByName('global').fetch(
      'https://registry/runs',
      { method: 'POST', body: JSON.stringify(run) },
    )
    if (!response.ok) throw new Error('Registry unavailable')
    return run
  }
  async getRun(id: string) {
    return this.request<RunSnapshot | null>(id, '/')
  }
  async command(id: string, action: 'pause' | 'resume' | 'cancel') {
    return this.request<RunSnapshot>(id, `/${action}`, { method: 'POST' })
  }
  async attempts(id: string, matchId?: string) {
    return this.request<Attempt[]>(
      id,
      `/attempts${matchId ? `?matchId=${encodeURIComponent(matchId)}` : ''}`,
    )
  }
  async live(id: string, request: Request): Promise<Response> {
    return (await this.env.BENCHMARK_RUN.getByName(id).fetch('https://run/live', {
      headers: Object.fromEntries(request.headers),
    })) as unknown as Response
  }
  async exportRun(id: string): Promise<Response> {
    return (await this.env.BENCHMARK_RUN.getByName(id).fetch(
      'https://run/export',
    )) as unknown as Response
  }

  private async request<T>(
    id: string,
    path: string,
    options?: { method?: string; body?: string },
  ): Promise<T> {
    const response = await this.env.BENCHMARK_RUN.getByName(id).fetch(`https://run${path}`, options)
    if (!response.ok) {
      if (response.status === 409)
        throw new RunConflict(((await response.json()) as { error: string }).error)
      throw new Error('Run object unavailable')
    }
    return (await response.json()) as T
  }
}
