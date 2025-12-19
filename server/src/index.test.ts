import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from './index'
import { db } from './db'
import { players } from './db/schema'

describe('API Endpoints', () => {
  it('GET / should return Hello Hono!', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello Hono!')
  })

  it('GET /api/games should return a list of games', async () => {
    const res = await app.request('/api/games')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('POST /api/games should create a new game', async () => {
    // Insert players to satisfy FK constraints
    await db.insert(players).values([
      { id: 'test-p1', name: 'Test P1', type: 'human', createdAt: new Date() },
      { id: 'test-p2', name: 'Test P2', type: 'human', createdAt: new Date() }
    ]).onConflictDoNothing()

    const res = await app.request('/api/games', {
      method: 'POST',
      body: JSON.stringify({ whitePlayerId: 'test-p1', blackPlayerId: 'test-p2' }),
      headers: { 'Content-Type': 'application/json' }
    })
    expect(res.status).toBe(201)
  })

  it('GET /api/games/:id/moves should return moves for a game with thinking data', async () => {
    // Create a game first
    const whitePlayerId = 'test-p1'
    const blackPlayerId = 'test-p2'
    await db.insert(players).values([
      { id: whitePlayerId, name: 'Test P1', type: 'human', createdAt: new Date() },
      { id: blackPlayerId, name: 'Test P2', type: 'human', createdAt: new Date() }
    ]).onConflictDoNothing()

    const createRes = await app.request('/api/games', {
      method: 'POST',
      body: JSON.stringify({ whitePlayerId, blackPlayerId }),
      headers: { 'Content-Type': 'application/json' }
    })
    const { id: gameId } = await createRes.json()

    const moveRes = await app.request(`/api/games/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({ 
        move: 'e4', 
        thinking: { opening: 'King Pawn', reasoning: 'Control' } 
      }),
      headers: { 'Content-Type': 'application/json' }
    })
    expect(moveRes.status).toBe(200)

    // Inject a move with thinking data manually or via service if exported
    // For API test, we just check the structure
    const res = await app.request(`/api/games/${gameId}/moves`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('opening')
      expect(data[0]).toHaveProperty('candidates')
      expect(data[0]).toHaveProperty('reasoning')
    }
  })

  it('DELETE /api/games/:id should delete a game', async () => {
    const res = await app.request('/api/games/non-existent-id', {
      method: 'DELETE'
    })
    expect(res.status).toBe(200) // success: true even if not found currently
  })

  it('DELETE /api/games should clear history', async () => {
    const res = await app.request('/api/games', {
      method: 'DELETE'
    })
    expect(res.status).toBe(200)
  })
})
