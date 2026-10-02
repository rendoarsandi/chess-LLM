import type { DurableObjectNamespace, Fetcher } from '@cloudflare/workers-types'

export interface WorkerEnv {
  BENCHMARK_RUN: DurableObjectNamespace
  ARENA_REGISTRY: DurableObjectNamespace
  ASSETS: Fetcher
  OPENROUTER_API_KEY?: string
  ADMIN_API_TOKEN?: string
  OPENROUTER_APP_TITLE?: string
  OPENROUTER_HTTP_REFERER?: string
}
