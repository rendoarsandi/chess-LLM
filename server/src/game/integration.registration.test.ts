import { describe, it, expect } from 'vitest'
import { db } from '../db'
import { players } from '../db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

function generatePlayerId(seed: string): string {
  return crypto.createHash('sha256').update(seed).digest('hex').substring(0, 36);
}

describe('System Player Registration Integration', () => {
  it('should have Groq models registered in the database', async () => {
    // We import the app to trigger initialization
    const { initPromise } = await import('../index')
    
    // Wait for initialization to finish
    await initPromise

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