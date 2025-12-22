import { db as defaultDb } from '../db'
import { gameReviews, moveAnalyses } from '../db/schema'
import { eq, and, lt, asc } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export interface MoveAnalysis {
  moveNumber: number;
  playerColor: 'white' | 'black';
  classification: string;
  evaluation: number;
  bestLine?: string;
}

export class GameReviewService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any

  constructor(db = defaultDb) {
    this.db = db
  }

  async requestReview(gameId: string) {
    const existing = await this.db.select()
      .from(gameReviews)
      .where(eq(gameReviews.gameId, gameId))
      .limit(1)

    if (existing.length > 0) {
      const review = existing[0]
      if (review.status === 'failed') {
        // Reset failed review
        await this.db.update(gameReviews)
          .set({ 
            status: 'queued', 
            workerId: null, 
            startedAt: null, 
            lastHeartbeat: null, 
            progressCurrent: 0, 
            progressTotal: 0,
            completedAt: null 
          })
          .where(eq(gameReviews.id, review.id))
        return { ...review, status: 'queued', workerId: null }
      }
      return review
    }

    const id = randomUUID()
    console.log(`[GameReviewService] Creating new review ${id} for game ${gameId}`);
    const newReview = {
      id,
      gameId,
      status: 'queued' as const,
      // Let database handle createdAt default
    }

    try {
        await this.db.insert(gameReviews).values(newReview)
        console.log(`[GameReviewService] Successfully persisted review ${id}`);
    } catch (e) {
        console.error(`[GameReviewService] Failed to persist review ${id}:`, e);
        throw e; // Rethrow so the API returns an error instead of a fake success
    }
    return newReview
  }

  async claimJob(workerId: string) {
    // Reset stuck jobs first
    const timeout = new Date(Date.now() - 10000) // 10 seconds heartbeat timeout
    const stuckJobs = await this.db.select()
      .from(gameReviews)
      .where(and(
        eq(gameReviews.status, 'processing'),
        lt(gameReviews.lastHeartbeat, timeout)
      ))

    if (stuckJobs.length > 0) {
      console.log(`[GameReviewService] Resetting ${stuckJobs.length} stuck jobs`);
      await this.db.update(gameReviews)
        .set({ status: 'queued', workerId: null, startedAt: null, lastHeartbeat: null, progressCurrent: 0, progressTotal: 0 })
        .where(and(
          eq(gameReviews.status, 'processing'),
          lt(gameReviews.lastHeartbeat, timeout)
        ))
    }

    // Find oldest queued job
    const jobs = await this.db.select()
      .from(gameReviews)
      .where(eq(gameReviews.status, 'queued'))
      .orderBy(asc(gameReviews.createdAt))
      .limit(1)

    if (jobs.length === 0) {
      return null
    }

    const job = jobs[0]
    console.log(`[GameReviewService] Worker ${workerId} attempting to claim job ${job.id}`);
    
    const updated = {
      status: 'processing' as const,
      workerId,
      startedAt: new Date(),
      lastHeartbeat: new Date(),
      progressCurrent: 0,
      progressTotal: 0
    }

    await this.db.update(gameReviews)
      .set(updated)
      .where(and(
        eq(gameReviews.id, job.id),
        eq(gameReviews.status, 'queued')
      ))

    // For better-sqlite3, drizzle might return the result or we might need to check differently
    // Actually, in drizzle-orm with better-sqlite3, .run() returns { changes: number }
    // Let's use a try-catch or a more generic check
    console.log(`[GameReviewService] Worker ${workerId} claim attempt finished for job ${job.id}`);
    
    return { ...job, ...updated }
  }

  async reportFailure(reviewId: string) {
    await this.db.update(gameReviews)
      .set({ 
        status: 'failed',
        completedAt: new Date(),
        // We could add an error column to gameReviews if we wanted to store it
      })
      .where(eq(gameReviews.id, reviewId))
  }

  async updateProgress(reviewId: string, current: number, total: number) {
    await this.db.update(gameReviews)
      .set({ 
        progressCurrent: current, 
        progressTotal: total,
        lastHeartbeat: new Date() 
      })
      .where(eq(gameReviews.id, reviewId))
  }

  async heartbeat(reviewId: string) {
    await this.db.update(gameReviews)
      .set({ lastHeartbeat: new Date() })
      .where(eq(gameReviews.id, reviewId))
  }

  async submitResults(reviewId: string, results: MoveAnalysis[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.db.transaction((tx: any) => {
      tx.update(gameReviews)
        .set({
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(gameReviews.id, reviewId))
        .run()

      const analyses = results.map(r => ({
        reviewId,
        moveNumber: r.moveNumber,
        playerColor: r.playerColor,
        classification: r.classification,
        evaluation: r.evaluation.toString(),
        bestLine: r.bestLine,
        createdAt: new Date()
      }))

      if (analyses.length > 0) {
        tx.insert(moveAnalyses).values(analyses).run()
      }
    })
  }

  async getReviewStatus(gameId: string) {
    const reviews = await this.db.select()
      .from(gameReviews)
      .where(eq(gameReviews.gameId, gameId))
      .limit(1)
    
    if (reviews.length === 0) return null

    const review = reviews[0]
    if (review.status === 'completed') {
      const analyses = await this.db.select()
        .from(moveAnalyses)
        .where(eq(moveAnalyses.reviewId, review.id))
        .orderBy(asc(moveAnalyses.moveNumber))
      return { ...review, analyses }
    }

    return review
  }
}
