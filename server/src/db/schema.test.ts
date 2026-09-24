import { describe, it, expect } from 'vitest'
import * as schema from './schema'
import { createInMemoryDb } from './test-utils'
import { eq } from 'drizzle-orm'

describe('Database Schema', () => {
  it('should query and insert into tables in memory', async () => {
    const { db } = createInMemoryDb()

    await db.insert(schema.players).values({
      id: 'test-player-schema',
      name: 'Schema Tester',
      type: 'llm',
      wins960: 10,
      rating960: 1500,
    })

    const result = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, 'test-player-schema'))

    expect(result).toHaveLength(1)
    expect(result[0].wins960).toBe(10)
    expect(result[0].rating960).toBe(1500)
  })
})
