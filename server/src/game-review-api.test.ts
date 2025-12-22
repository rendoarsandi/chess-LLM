import { describe, it, expect, beforeEach } from 'vitest'
import app from './index'
import { db } from './db'
import { gameReviews, moveAnalyses, players, games, moves, ratingHistory, llmConfigurations, tournamentParticipants, tournaments } from './db/schema'
import { eq } from 'drizzle-orm'

describe('Game Review API Endpoints', () => {
  const testGameId = 'test-game-id'
  const testWorkerId = 'test-worker-id'

  beforeEach(async () => {
    // Clean up in correct order of dependencies
    await db.delete(moveAnalyses)
    await db.delete(gameReviews)
    await db.delete(moves)
    await db.delete(ratingHistory)
    await db.delete(llmConfigurations)
    await db.delete(tournamentParticipants)
    await db.delete(games)
    await db.delete(players)
    await db.delete(tournaments)

    // Setup basic data
    await db.insert(players).values([
      { id: 'p1', name: 'P1', type: 'human' },
      { id: 'p2', name: 'P2', type: 'human' }
    ])
    await db.insert(games).values({
      id: testGameId,
      whitePlayerId: 'p1',
      blackPlayerId: 'p2',
      status: 'completed'
    })
  })

  it('POST /api/reviews/:gameId should request a new review', async () => {
    const res = await app.request(`/api/reviews/${testGameId}`, {
      method: 'POST'
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.gameId).toBe(testGameId)
    expect(data.status).toBe('queued')

    // Request again, should return existing
    const res2 = await app.request(`/api/reviews/${testGameId}`, {
      method: 'POST'
    })
    const data2 = await res2.json()
    expect(data2.id).toBe(data.id)
  })

  it('POST /api/reviews/worker/claim should return message if no jobs', async () => {
    const res = await app.request('/api/reviews/worker/claim', {
      method: 'POST',
      body: JSON.stringify({ workerId: testWorkerId }),
      headers: { 'Content-Type': 'application/json' }
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBe('No jobs available')
  })

  it('POST /api/reviews/worker/claim should claim a queued job', async () => {
    // First, request a review
    await app.request(`/api/reviews/${testGameId}`, { method: 'POST' })

    const res = await app.request('/api/reviews/worker/claim', {
      method: 'POST',
      body: JSON.stringify({ workerId: testWorkerId }),
      headers: { 'Content-Type': 'application/json' }
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.workerId).toBe(testWorkerId)
    expect(data.status).toBe('processing')
  })

  it('POST /api/reviews/worker/heartbeat should update heartbeat', async () => {
    // Request and claim
    await app.request(`/api/reviews/${testGameId}`, { method: 'POST' })
    const claimRes = await app.request('/api/reviews/worker/claim', {
      method: 'POST',
      body: JSON.stringify({ workerId: testWorkerId }),
      headers: { 'Content-Type': 'application/json' }
    })
    const { id: reviewId } = await claimRes.json()

    const res = await app.request('/api/reviews/worker/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ reviewId }),
      headers: { 'Content-Type': 'application/json' }
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('POST /api/reviews/worker/submit should submit results', async () => {
    // Request and claim
    await app.request(`/api/reviews/${testGameId}`, { method: 'POST' })
    const claimRes = await app.request('/api/reviews/worker/claim', {
      method: 'POST',
      body: JSON.stringify({ workerId: testWorkerId }),
      headers: { 'Content-Type': 'application/json' }
    })
    const { id: reviewId } = await claimRes.json()

    const results = [
      { moveNumber: 1, classification: 'best', evaluation: 0.5, bestLine: 'e4 e5' },
      { moveNumber: 2, classification: 'excellent', evaluation: 0.4, bestLine: 'd4 d5' }
    ]

    const res = await app.request('/api/reviews/worker/submit', {
      method: 'POST',
      body: JSON.stringify({ reviewId, results }),
      headers: { 'Content-Type': 'application/json' }
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

  it('GET /api/reviews/:gameId should return review status and results', async () => {
    // Request a review
    await app.request(`/api/reviews/${testGameId}`, { method: 'POST' })
    
    // Check initial status
    let res = await app.request(`/api/reviews/${testGameId}`)
    let data = await res.json()
    expect(data.status).toBe('queued')

    // Claim and submit
    const claimRes = await app.request('/api/reviews/worker/claim', {
      method: 'POST',
      body: JSON.stringify({ workerId: testWorkerId }),
      headers: { 'Content-Type': 'application/json' }
    })
    const { id: reviewId } = await claimRes.json()

    await app.request('/api/reviews/worker/submit', {
      method: 'POST',
      body: JSON.stringify({ 
        reviewId, 
        results: [{ moveNumber: 1, classification: 'best', evaluation: 0.5, bestLine: 'e4' }] 
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    // Check final status
    res = await app.request(`/api/reviews/${testGameId}`)
    data = await res.json()
    expect(data.status).toBe('completed')
    expect(data.analyses.length).toBe(1)
    expect(data.analyses[0].classification).toBe('best')
  })
})
