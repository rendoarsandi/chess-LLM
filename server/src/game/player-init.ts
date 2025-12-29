import { getDb } from '../db'
import { players, llmConfigurations } from '../db/schema'
import { eq } from 'drizzle-orm'
import { PlayerService } from './player.service'
import { GameManager } from './game-manager'
import { LLMConfig } from '../db/llm_config'

// System Player IDs (Hardcoded for core bots to preserve history)
export const STOCKFISH_LOW_ID = '00000000-0000-0000-0000-000000000010'
export const STOCKFISH_MED_ID = '00000000-0000-0000-0000-000000000011'
export const STOCKFISH_HIGH_ID = '00000000-0000-0000-0000-000000000012'
export const STOCKFISH_VERY_HIGH_ID = '00000000-0000-0000-0000-000000000013'

export async function initializePlayers(playerService: PlayerService, gameManager: GameManager) {
  console.log('[Main] Synchronizing LLM configurations...')
  const currentDb = getDb()

  const hardcodedModels = [
    { provider: 'gemini', modelId: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', rating: 2500 },
    { provider: 'gemini', modelId: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', rating: 2300 },
    { provider: 'gemini', modelId: 'gemma-3-27b-it', name: 'Gemma 3 27B', rating: 2400 },
    { provider: 'gemini', modelId: 'gemma-3-12b-it', name: 'Gemma 3 12B', rating: 2100 },
    {
      provider: 'groq',
      modelId: 'moonshotai/kimi-k2-instruct-0905',
      name: 'Kimi k2',
      rating: 2600,
    },
    { provider: 'groq', modelId: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', rating: 2700 },
    { provider: 'groq', modelId: 'qwen/qwen3-32b', name: 'Qwen 3 32B', rating: 2550 },
  ]

  const builtinPlayers = [
    {
      id: STOCKFISH_LOW_ID,
      name: 'Stockfish (Low)',
      type: 'llm' as const,
      rating: 1500,
      provider: 'system',
    },
    {
      id: STOCKFISH_MED_ID,
      name: 'Stockfish (Medium)',
      type: 'llm' as const,
      rating: 2000,
      provider: 'system',
    },
    {
      id: STOCKFISH_HIGH_ID,
      name: 'Stockfish (High)',
      type: 'llm' as const,
      rating: 2500,
      provider: 'system',
    },
    {
      id: STOCKFISH_VERY_HIGH_ID,
      name: 'Stockfish (Very High)',
      type: 'llm' as const,
      rating: 3200,
      provider: 'system',
    },
  ]

  // 1. Ensure built-in players exist in 'players' table
  for (const p of builtinPlayers) {
    await currentDb
      .insert(players)
      .values({ ...p, peakRating: p.rating })
      .onConflictDoNothing()
  }

  // 2. Sync LLM configurations
  await playerService.syncHardcodedConfigs(hardcodedModels)

  // 3. Get all active IDs from configurations and builtin list
  const activeConfigs = await currentDb.select().from(llmConfigurations)
  const activePlayerIds = [
    ...builtinPlayers.map((p) => p.id),
    ...activeConfigs.filter((c: LLMConfig) => c.playerId).map((c: LLMConfig) => c.playerId),
  ] as string[]

  // 4. Remove any players NOT in the allowed list (orphaned test profiles)
  if (process.env.NODE_ENV !== 'test') {
    const allDbPlayers = await currentDb.select().from(players)
    for (const p of allDbPlayers) {
      if (!activePlayerIds.includes(p.id)) {
        await currentDb.delete(players).where(eq(players.id, p.id))
        console.log(`[Main] Deleted orphaned player profile: ${p.name} (${p.id})`)
      }
    }
  }

  // 5. Initialize active players in GameManager
  await playerService.initializeActivePlayers(gameManager)

  console.log('[Main] Player initialization complete.')
}
