import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { players, games, llmConfigurations, moves, ratingHistory, gameReviews, moveAnalyses, tournamentParticipants, tournaments } from '../db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

function generatePlayerId(seed: string): string {
  // Matches PlayerService.ts implementation exactly
  return crypto.createHash('sha256').update(seed).digest('hex').substring(0, 36);
}

describe('System Player Registration Integration', () => {
  beforeEach(async () => {
    // Explicit cleanup for shared test DB in correct order to respect FKs
    await db.delete(moveAnalyses)
    await db.delete(gameReviews)
    await db.delete(moves)
    await db.delete(ratingHistory)
    await db.delete(llmConfigurations)
    await db.delete(tournamentParticipants)
    await db.delete(games)
    await db.delete(players)
    await db.delete(tournaments)
  })

  it('should have Groq models registered in the database', async () => {
    // We import the initialization function and run it explicitly
    // because beforeEach clears the database
    const { initializePlayers } = await import('../index')
    
    // Run initialization
    await initializePlayers()

    const allPlayers = await db.select().from(players)
    console.log('[DEBUG] Registered players:', allPlayers.map(p => ({ id: p.id, name: p.name })))

    const KIMI_ID = generatePlayerId('groq-moonshotai/kimi-k2-instruct-0905')
    const GPT_OSS_ID = generatePlayerId('groq-openai/gpt-oss-120b')
    const QWEN_ID = generatePlayerId('groq-qwen/qwen3-32b')

    const kimi = await db.select().from(players).where(eq(players.id, KIMI_ID))
    const gptOss = await db.select().from(players).where(eq(players.id, GPT_OSS_ID))
    const qwen = await db.select().from(players).where(eq(players.id, QWEN_ID))

    expect(kimi.length).toBe(1)
    expect(gptOss.length).toBe(1)
    expect(qwen.length).toBe(1)
  }, 15000)
})