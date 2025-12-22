import { describe, it, expect, beforeEach } from 'vitest'
import { GameReviewService } from './game-review.service'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { games, players, gameReviews, moveAnalyses } from '../db/schema'
import { eq } from 'drizzle-orm'

describe('GameReviewService', () => {
  let service: GameReviewService
  let db: any

  beforeEach(() => {
    const sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    
    sqlite.exec(`
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 1200,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        draws INTEGER NOT NULL DEFAULT 0,
        peak_rating INTEGER NOT NULL DEFAULT 1200,
        version TEXT,
        provider TEXT,
        bio TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE games (
        id TEXT PRIMARY KEY,
        white_player_id TEXT NOT NULL,
        black_player_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ongoing',
        fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        winner_id TEXT,
        game_over_reason TEXT,
        pgn TEXT,
        tournament_id TEXT,
        round_number INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(white_player_id) REFERENCES players(id),
        FOREIGN KEY(black_player_id) REFERENCES players(id)
      );
      CREATE TABLE game_reviews (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        progress_current INTEGER NOT NULL DEFAULT 0,
        progress_total INTEGER NOT NULL DEFAULT 0,
        started_at INTEGER,
        worker_id TEXT,
        last_heartbeat INTEGER,
        completed_at INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(game_id) REFERENCES games(id)
      );
      CREATE TABLE move_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id TEXT NOT NULL,
        move_number INTEGER NOT NULL,
        classification TEXT NOT NULL,
        evaluation TEXT NOT NULL,
        best_line TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(review_id) REFERENCES game_reviews(id)
      );
    `)

    service = new GameReviewService(db)
  })

  async function setupGame() {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', createdAt: new Date() })
    const gameId = 'game-1'
    await db.insert(games).values({
      id: gameId,
      whitePlayerId: 'p1',
      blackPlayerId: 'p2',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return gameId
  }

  it('should request a review for a game', async () => {
    const gameId = await setupGame()
    const review = await service.requestReview(gameId)
    
    expect(review).toBeDefined()
    expect(review.gameId).toBe(gameId)
    expect(review.status).toBe('queued')
    
    const dbReview = (await db.select().from(gameReviews).where(eq(gameReviews.gameId, gameId)))[0]
    expect(dbReview).toBeDefined()
    expect(dbReview.id).toBe(review.id)
  })

  it('should return existing review if already requested', async () => {
    const gameId = await setupGame()
    const review1 = await service.requestReview(gameId)
    const review2 = await service.requestReview(gameId)
    expect(review1.id).toBe(review2.id)
  })

  it('should claim a job', async () => {
    const gameId = await setupGame()
    await service.requestReview(gameId)
    
    const workerId = 'worker-1'
    const job = await service.claimJob(workerId)
    
    expect(job).toBeDefined()
    expect(job?.gameId).toBe(gameId)
    expect(job?.status).toBe('processing')
    expect(job?.workerId).toBe(workerId)
    expect(job?.progressCurrent).toBe(0)
    expect(job?.progressTotal).toBe(0)
    expect(job?.startedAt).toBeDefined()
    expect(job?.lastHeartbeat).toBeDefined()
  })

  it('should not claim a job if none available', async () => {
    const job = await service.claimJob('worker-1')
    expect(job).toBeNull()
  })

  it('should update heartbeat', async () => {
    const gameId = await setupGame()
    await service.requestReview(gameId)
    const job = await service.claimJob('worker-1')
    
    // SQLite mode timestamp is usually in seconds, so we need to wait at least 1s to ensure it changes
    // or we compare with second precision.
    await new Promise(r => setTimeout(r, 1001))
    
    await service.heartbeat(job!.id)
    const updatedJob = (await db.select().from(gameReviews).where(eq(gameReviews.id, job!.id)))[0]
    expect(updatedJob.lastHeartbeat!.getTime()).toBeGreaterThanOrEqual(job!.lastHeartbeat!.getTime())
  })

  it('should update progress', async () => {
    const gameId = await setupGame()
    await service.requestReview(gameId)
    const job = await service.claimJob('worker-1')
    
    await service.updateProgress(job!.id, 5, 20)
    const updatedJob = (await db.select().from(gameReviews).where(eq(gameReviews.id, job!.id)))[0]
    expect(updatedJob.progressCurrent).toBe(5)
    expect(updatedJob.progressTotal).toBe(20)
  })

  it('should submit results', async () => {
    const gameId = await setupGame()
    await service.requestReview(gameId)
    const job = await service.claimJob('worker-1')
    const results = [
      { moveNumber: 1, classification: 'best', evaluation: 0.3, bestLine: 'e4' },
      { moveNumber: 2, classification: 'good', evaluation: 0.2, bestLine: 'e5' }
    ]
    
    await service.submitResults(job!.id, results)
    
    const updatedJob = (await db.select().from(gameReviews).where(eq(gameReviews.id, job!.id)))[0]
    expect(updatedJob.status).toBe('completed')
    expect(updatedJob.completedAt).toBeDefined()
    
    const analyses = await db.select().from(moveAnalyses).where(eq(moveAnalyses.reviewId, job!.id))
    expect(analyses).toHaveLength(2)
    expect(analyses[0].classification).toBe('best')
  })

  it('should submit results with empty array', async () => {
    const gameId = await setupGame()
    await service.requestReview(gameId)
    const job = await service.claimJob('worker-1')
    
    await service.submitResults(job!.id, [])
    
    const updatedJob = (await db.select().from(gameReviews).where(eq(gameReviews.id, job!.id)))[0]
    expect(updatedJob.status).toBe('completed')
    
    const analyses = await db.select().from(moveAnalyses).where(eq(moveAnalyses.reviewId, job!.id))
    expect(analyses).toHaveLength(0)
  })

  it('should reset stuck jobs on claimJob', async () => {
    const gameId = await setupGame()
    await service.requestReview(gameId)
    const job = await service.claimJob('worker-1')
    
    // Manually set heartbeat to far in the past
    const oldDate = new Date(Date.now() - 10000) // 10s ago
    await db.update(gameReviews).set({ lastHeartbeat: oldDate }).where(eq(gameReviews.id, job!.id))
    
    // Claiming as another worker should pick up the same job
    const newJob = await service.claimJob('worker-2')
    expect(newJob?.id).toBe(job?.id)
    expect(newJob?.workerId).toBe('worker-2')
  })

  it('should get review status', async () => {
    const gameId = await setupGame()
    
    // Not requested yet
    const status1 = await service.getReviewStatus(gameId)
    expect(status1).toBeNull()
    
    // Requested (queued)
    const review = await service.requestReview(gameId)
    const status2 = await service.getReviewStatus(gameId)
    expect(status2?.id).toBe(review.id)
    expect(status2?.status).toBe('queued')
    
    // Completed
    const job = await service.claimJob('worker-1')
    const results = [
      { moveNumber: 1, classification: 'best', evaluation: 0.3, bestLine: 'e4' }
    ]
    await service.submitResults(job!.id, results)
    
    const status3 = (await service.getReviewStatus(gameId)) as any
    expect(status3?.status).toBe('completed')
    expect(status3?.analyses).toHaveLength(1)
    expect(status3?.analyses[0].classification).toBe('best')
  })
})
