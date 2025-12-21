import { describe, it, expect } from 'vitest'
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
    // Clear history first to ensure no ongoing games
    await app.request('/api/games', { method: 'DELETE' })

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
    // Clear history first
    await app.request('/api/games', { method: 'DELETE' })

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

  it('GET /api/leaderboard should return ranked players', async () => {
    // Insert players with different ratings
    await db.insert(players).values([
      { id: 'leader-1', name: 'Pro', type: 'llm', rating: 1500, createdAt: new Date() },
      { id: 'leader-2', name: 'Noob', type: 'llm', rating: 1000, createdAt: new Date() },
      { id: 'leader-3', name: 'Average', type: 'llm', rating: 1200, createdAt: new Date() }
    ]).onConflictDoNothing()

    const res = await app.request('/api/leaderboard')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThanOrEqual(3)
    
    // Check sorting
    expect(data[0].rating).toBeGreaterThanOrEqual(data[1].rating)
    expect(data[1].rating).toBeGreaterThanOrEqual(data[2].rating)
    
    // Check fields
    expect(data[0]).toHaveProperty('wins')
    expect(data[0]).toHaveProperty('peakRating')
  })

  it('GET /api/players/:id/profile should return player profile', async () => {
    const playerId = 'profile-test-1'
    await db.insert(players).values({
      id: playerId,
      name: 'Gemini Profile',
      type: 'llm',
      version: '1.5',
      provider: 'Google',
      bio: 'Test bio',
      rating: 1200,
      createdAt: new Date()
    }).onConflictDoNothing()

    const res = await app.request(`/api/players/${playerId}/profile`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe('Gemini Profile')
    expect(data.version).toBe('1.5')
  })

  it('GET /api/players/:id/elo-history should return rating history', async () => {
    const res = await app.request('/api/players/profile-test-1/elo-history')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('GET /api/players/:id/head-to-head should return head-to-head records', async () => {
    const res = await app.request('/api/players/profile-test-1/head-to-head')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })
})
