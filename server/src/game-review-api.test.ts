import { describe, it, expect, beforeEach, vi } from 'vitest'
import app from './index'
import { db } from './db'
import { gameReviews, moveAnalyses, players, games, moves, ratingHistory, llmConfigurations, tournamentParticipants, tournaments } from './db/schema'
import { eq } from 'drizzle-orm'
import { auth } from './lib/auth'

describe('Game Review API Endpoints', () => {
  const testWorkerId = 'test-worker-id'
  const testWorkerToken = 'test-worker-token'
  const testAdminEmail = 'admin@example.com'
  const testPlayerId = 'p1-game-id'

  beforeEach(async () => {
    process.env.WORKER_TOKEN = testWorkerToken
    process.env.ADMIN_EMAIL = testAdminEmail
    
    // Explicit cleanup for in-memory DB shared state
    await db.delete(moveAnalyses)
    await db.delete(gameReviews)
    await db.delete(moves)
    await db.delete(ratingHistory)
    await db.delete(llmConfigurations)
    await db.delete(tournamentParticipants)
    await db.delete(games)
    await db.delete(players)
    await db.delete(tournaments)

    // Mock auth session
    vi.spyOn(auth.api, 'getSession').mockImplementation(async () => {
      return {
        user: {
          id: testPlayerId,
          email: 'player@example.com',
          name: 'Test Player',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          banned: false
        },
        session: {
          id: 'session-id',
          userId: testPlayerId,
          token: 'token',
          expiresAt: new Date(Date.now() + 10000),
          createdAt: new Date(),
          updatedAt: new Date(),
          userAgent: '',
          ipAddress: ''
        }
      }
    })
  })

  const setupGame = async (gameId: string) => {
    await db.insert(players).values([
      { id: testPlayerId, name: 'P1', type: 'human' },
      { id: `p2-${gameId}`, name: 'P2', type: 'human' }
    ]).onConflictDoNothing()
    await db.insert(games).values({
      id: gameId,
      whitePlayerId: testPlayerId,
      blackPlayerId: `p2-${gameId}`,
      status: 'completed'
    })
  }

  it('POST /api/reviews/:gameId should request a new review', async () => {
    const gameId = `game-${Math.random()}`
    await setupGame(gameId)

    const res = await app.request(`/api/reviews/${gameId}`, {
      method: 'POST'
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.gameId).toBe(gameId)
    expect(data.status).toBe('queued')

    // Request again, should return existing
    const res2 = await app.request(`/api/reviews/${gameId}`, {
      method: 'POST'
    })
    const data2 = await res2.json()
    expect(data2.id).toBe(data.id)
  })

  it('POST /api/reviews/worker/claim should return message if no jobs', async () => {
    const res = await app.request('/api/reviews/worker/claim', {
      method: 'POST',
      body: JSON.stringify({ workerId: testWorkerId }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testWorkerToken}`
      }
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBe('No jobs available')
  })

  it('POST /api/reviews/worker/claim should claim a queued job', async () => {
    const gameId = `game-${Math.random()}`
    await setupGame(gameId)

    // First, request a review
    await app.request(`/api/reviews/${gameId}`, { method: 'POST' })

    const res = await app.request('/api/reviews/worker/claim', {
      method: 'POST',
      body: JSON.stringify({ workerId: testWorkerId }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testWorkerToken}`
      }
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.workerId).toBe(testWorkerId)
    expect(data.status).toBe('processing')
  })

  it('POST /api/reviews/worker/heartbeat should update heartbeat', async () => {
    const gameId = `game-${Math.random()}`
    await setupGame(gameId)

    // Request and claim
    await app.request(`/api/reviews/${gameId}`, { method: 'POST' })
    const claimRes = await app.request('/api/reviews/worker/claim', {
      method: 'POST',
      body: JSON.stringify({ workerId: testWorkerId }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testWorkerToken}`
      }
    })
    const { id: reviewId } = await claimRes.json()

    const res = await app.request('/api/reviews/worker/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ reviewId }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testWorkerToken}`
      }
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('POST /api/reviews/worker/progress should update progress', async () => {
    const gameId = `game-${Math.random()}`
    await setupGame(gameId)

    // Request and claim
    await app.request(`/api/reviews/${gameId}`, { method: 'POST' })
    const claimRes = await app.request('/api/reviews/worker/claim', {
      method: 'POST',
      body: JSON.stringify({ workerId: testWorkerId }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testWorkerToken}`
      }
    })
    const { id: reviewId } = await claimRes.json()

    const res = await app.request('/api/reviews/worker/progress', {
      method: 'POST',
      body: JSON.stringify({ reviewId, current: 10, total: 40 }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testWorkerToken}`
      }
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify in DB
    const review = await db.select().from(gameReviews).where(eq(gameReviews.id, reviewId)).limit(1)
    expect(review[0].progressCurrent).toBe(10)
    expect(review[0].progressTotal).toBe(40)
  })

  it('POST /api/reviews/worker/submit should submit results', async () => {
    const gameId = `game-${Math.random()}`
    await setupGame(gameId)

    // Request and claim
    await app.request(`/api/reviews/${gameId}`, { method: 'POST' })
    const claimRes = await app.request('/api/reviews/worker/claim', {
      method: 'POST',
      body: JSON.stringify({ workerId: testWorkerId }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testWorkerToken}`
      }
    })
    const { id: reviewId } = await claimRes.json()

    const results = [
      { moveNumber: 1, playerColor: 'white', classification: 'best', evaluation: 0.5, bestLine: 'e4 e5' },
      { moveNumber: 2, playerColor: 'black', classification: 'excellent', evaluation: 0.4, bestLine: 'd4 d5' }
    ]

    const res = await app.request('/api/reviews/worker/submit', {
      method: 'POST',
      body: JSON.stringify({ reviewId, results }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testWorkerToken}`
      }
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify in DB
    const review = await db.select().from(gameReviews).where(eq(gameReviews.id, reviewId)).limit(1)
    expect(review[0].status).toBe('completed')
    
    const analyses = await db.select().from(moveAnalyses).where(eq(moveAnalyses.reviewId, reviewId))
    expect(analyses.length).toBe(2)
  })

  it('POST /api/reviews/worker/failure should report failure', async () => {
    const gameId = `game-${Math.random()}`
    await setupGame(gameId)

    // Request and claim
    await app.request(`/api/reviews/${gameId}`, { method: 'POST' })
    const claimRes = await app.request('/api/reviews/worker/claim', {
      method: 'POST',
      body: JSON.stringify({ workerId: testWorkerId }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testWorkerToken}`
      }
    })
    const { id: reviewId } = await claimRes.json()

    const res = await app.request('/api/reviews/worker/failure', {
      method: 'POST',
      body: JSON.stringify({ reviewId }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testWorkerToken}`
      }
    })
    expect(res.status).toBe(200)
    
    // Verify in DB
    const review = await db.select().from(gameReviews).where(eq(gameReviews.id, reviewId)).limit(1)
    expect(review[0].status).toBe('failed')
  })

  it('GET /api/reviews/:gameId should return review status and results', async () => {
    const gameId = `game-${Math.random()}`
    await setupGame(gameId)

    // Request a review
    await app.request(`/api/reviews/${gameId}`, { method: 'POST' })
    
    // Check initial status
    let res = await app.request(`/api/reviews/${gameId}`)
    let data = await res.json()
    expect(data.status).toBe('queued')

    // Claim and submit
    const claimRes = await app.request('/api/reviews/worker/claim', {
      method: 'POST',
      body: JSON.stringify({ workerId: testWorkerId }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testWorkerToken}`
      }
    })
    const { id: reviewId } = await claimRes.json()

    await app.request('/api/reviews/worker/submit', {
      method: 'POST',
      body: JSON.stringify({ 
        reviewId, 
        results: [{ moveNumber: 1, playerColor: 'white', classification: 'best', evaluation: 0.5, bestLine: 'e4' }] 
      }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testWorkerToken}`
      }
    })

    // Check final status
    res = await app.request(`/api/reviews/${gameId}`)
    data = await res.json()
    expect(data.status).toBe('completed')
    expect(data.analyses.length).toBe(1)
    expect(data.analyses[0].classification).toBe('best')
  })
})
