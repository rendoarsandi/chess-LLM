import { getDb } from '../db'
import { gameReviews, moveAnalyses } from '../db/schema'
import { eq, and, lt, asc } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { AppDatabase } from '../db/types'

export interface MoveAnalysis {
  moveNumber: number
  playerColor: 'white' | 'black'
  classification: string
  evaluation: number
  bestLine?: string
}

export class GameReviewService {
  private db: AppDatabase

  constructor(db?: AppDatabase) {
    this.db = db || getDb()
  }

  async requestReview(gameId: string) {
    const existing = await this.db
      .select()
      .from(gameReviews)
      .where(eq(gameReviews.gameId, gameId))
      .limit(1)

    if (existing.length > 0) {
      const review = existing[0]
      if (review.status === 'failed') {
        // Reset failed review
        await this.db
          .update(gameReviews)
          .set({
            status: 'queued',
            workerId: null,
            startedAt: null,
            lastHeartbeat: null,
            progressCurrent: 0,
            progressTotal: 0,
            completedAt: null,
          })
          .where(eq(gameReviews.id, review.id))
        return { ...review, status: 'queued', workerId: null }
      }
      return review
    }

    const id = randomUUID()
    console.log(`[GameReviewService] Creating new review ${id} for game ${gameId}`)
    const newReview = {
      id,
      gameId,
      status: 'queued' as const,
      // Let database handle createdAt default
    }

    try {
      await this.db.insert(gameReviews).values(newReview)
      console.log(`[GameReviewService] Successfully persisted review ${id}`)
    } catch (e) {
      console.error(`[GameReviewService] Failed to persist review ${id}:`, e)
      throw e // Rethrow so the API returns an error instead of a fake success
    }
    return newReview
  }

  async claimJob(workerId: string) {
    // Reset stuck jobs first
    const timeout = new Date(Date.now() - 30000) // 30 seconds heartbeat timeout
    const stuckJobs = await this.db
      .select()
      .from(gameReviews)
      .where(and(eq(gameReviews.status, 'processing'), lt(gameReviews.lastHeartbeat, timeout)))

    if (stuckJobs.length > 0) {
      console.log(`[GameReviewService] Resetting ${stuckJobs.length} stuck jobs`)
      await this.db
        .update(gameReviews)
        .set({
          status: 'queued',
          workerId: null,
          startedAt: null,
          lastHeartbeat: null,
          progressCurrent: 0,
          progressTotal: 0,
        })
        .where(and(eq(gameReviews.status, 'processing'), lt(gameReviews.lastHeartbeat, timeout)))
    }

    // Find oldest queued job
    const jobs = await this.db
      .select()
      .from(gameReviews)
      .where(eq(gameReviews.status, 'queued'))
      .orderBy(asc(gameReviews.createdAt))
      .limit(1)

    if (jobs.length === 0) {
      return null
    }

    const job = jobs[0]
    console.log(`[GameReviewService] Worker ${workerId} attempting to claim job ${job.id}`)

    const updated = {
      status: 'processing' as const,
      workerId,
      startedAt: new Date(),
      lastHeartbeat: new Date(),
      progressCurrent: 0,
      progressTotal: 0,
    }

    const [updatedJob] = await this.db
      .update(gameReviews)
      .set(updated)
      .where(and(eq(gameReviews.id, job.id), eq(gameReviews.status, 'queued')))
      .returning()

    console.log(
      `[GameReviewService] Worker ${workerId} claim attempt finished for job ${job.id}. Success: ${!!updatedJob}`,
    )

    return updatedJob || null
  }

  async reportFailure(reviewId: string) {
    await this.db
      .update(gameReviews)
      .set({
        status: 'failed',
        completedAt: new Date(),
        // We could add an error column to gameReviews if we wanted to store it
      })
      .where(eq(gameReviews.id, reviewId))
      .run()
  }

  async updateProgress(reviewId: string, current: number, total: number) {
    await this.db
      .update(gameReviews)
      .set({
        progressCurrent: current,
        progressTotal: total,
        lastHeartbeat: new Date(),
      })
      .where(eq(gameReviews.id, reviewId))
      .run()
  }

  async heartbeat(reviewId: string) {
    await this.db
      .update(gameReviews)
      .set({ lastHeartbeat: new Date() })
      .where(eq(gameReviews.id, reviewId))
      .run()
  }

  async submitResults(reviewId: string, results: MoveAnalysis[]) {
    this.db.transaction((tx) => {
      tx.update(gameReviews)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(gameReviews.id, reviewId))
        .run()

      const analyses = results.map((r) => ({
        reviewId,
        moveNumber: r.moveNumber,
        playerColor: r.playerColor,
        classification: r.classification,
        evaluation: r.evaluation.toString(),
        bestLine: r.bestLine,
        createdAt: new Date(),
      }))

      if (analyses.length > 0) {
        tx.insert(moveAnalyses).values(analyses).run()
      }
    })
  }

  async getReviewStatus(
    gameId: string,
  ): Promise<
    (typeof gameReviews.$inferSelect & { analyses?: (typeof moveAnalyses.$inferSelect)[] }) | null
  > {
    const reviews = await this.db
      .select()
      .from(gameReviews)
      .where(eq(gameReviews.gameId, gameId))
      .limit(1)

    if (reviews.length === 0) return null

    const review = reviews[0]
    if (review.status === 'completed') {
      const analyses = await this.db
        .select()
        .from(moveAnalyses)
        .where(eq(moveAnalyses.reviewId, review.id))
        .orderBy(asc(moveAnalyses.moveNumber))
      return { ...review, analyses }
    }

    return review
  }
}
