import { db as defaultDb } from '../db'
import { gameReviews, moveAnalyses } from '../db/schema'
import { eq, and, lt, asc } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export class GameReviewService {
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
      return existing[0]
    }

    const id = randomUUID()
    const newReview = {
      id,
      gameId,
      status: 'queued' as const,
      createdAt: new Date()
    }

    await this.db.insert(gameReviews).values(newReview)
    return newReview
  }

  async claimJob(workerId: string) {
    // Reset stuck jobs first
    const timeout = new Date(Date.now() - 5000) // 5 seconds heartbeat timeout
    await this.db.update(gameReviews)
      .set({ status: 'queued', workerId: null, startedAt: null, lastHeartbeat: null })
      .where(and(
        eq(gameReviews.status, 'processing'),
        lt(gameReviews.lastHeartbeat, timeout)
      ))

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
    const updated = {
      status: 'processing' as const,
      workerId,
      startedAt: new Date(),
      lastHeartbeat: new Date()
    }

    await this.db.update(gameReviews)
      .set(updated)
      .where(eq(gameReviews.id, job.id))

    return { ...job, ...updated }
  }

  async heartbeat(reviewId: string) {
    await this.db.update(gameReviews)
      .set({ lastHeartbeat: new Date() })
      .where(eq(gameReviews.id, reviewId))
  }

  async submitResults(reviewId: string, results: any[]) {
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
        classification: r.classification,
        evaluation: r.evaluation,
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
