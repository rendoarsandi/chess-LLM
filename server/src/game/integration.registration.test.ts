import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { players } from '../db/schema'
import { eq } from 'drizzle-orm'

// IDs defined in the implementation (planned)
const KIMI_ID = '00000000-0000-0000-0000-000000000020'
const GPT_OSS_ID = '00000000-0000-0000-0000-000000000021'
const QWEN_ID = '00000000-0000-0000-0000-000000000022'

describe('System Player Registration Integration', () => {
  it('should have Groq models registered in the database', async () => {
    // We import the app to trigger initialization
    await import('../index')
    
    // Wait a bit for ensureSystemPlayers to finish (it's async and called without await in index.ts)
    // In a real scenario, we might want to export the promise from index.ts
    await new Promise(resolve => setTimeout(resolve, 1000))

    const kimi = await db.select().from(players).where(eq(players.id, KIMI_ID))
    const gptOss = await db.select().from(players).where(eq(players.id, GPT_OSS_ID))
    const qwen = await db.select().from(players).where(eq(players.id, QWEN_ID))

    expect(kimi.length).toBe(1)
    expect(kimi[0].name).toBe('Kimi k2')
    
    expect(gptOss.length).toBe(1)
    expect(gptOss[0].name).toBe('GPT-OSS 120B')
    
    expect(qwen.length).toBe(1)
    expect(qwen[0].name).toBe('Qwen 3 32B')
  })
})
