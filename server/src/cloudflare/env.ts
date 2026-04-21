/// <reference types="@cloudflare/workers-types" />

export type CloudflareEnv = {
  DB: D1Database
  GAME_ROOM: DurableObjectNamespace
  ARENA_SCHEDULER: DurableObjectNamespace
  ADMIN_API_TOKEN?: string
  MATCHMAKING_ENABLED?: string
  MATCHMAKING_INTERVAL_MS?: string
  MATCHMAKING_VARIANT?: string
  OPENROUTER_API_KEY?: string
  OPENROUTER_HTTP_REFERER?: string
  OPENROUTER_APP_TITLE?: string
  GEMINI_API_KEY?: string
  GROQ_API_KEY?: string
}

export function cloudflareMatchmakingConfig(env: CloudflareEnv) {
  const intervalMs = Number(env.MATCHMAKING_INTERVAL_MS)

  return {
    enabled: env.MATCHMAKING_ENABLED === 'true',
    intervalMs: Number.isFinite(intervalMs) ? intervalMs : undefined,
    variant: env.MATCHMAKING_VARIANT === 'chess960' ? ('chess960' as const) : ('standard' as const),
  }
}
