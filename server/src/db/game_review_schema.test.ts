import { describe, it, expect } from 'vitest'
import * as schema from './schema'

describe('Game Review Schema', () => {
  it('should have gameReviews table defined', () => {
    expect(schema.gameReviews).toBeDefined()
    expect(schema.gameReviews.gameId).toBeDefined()
    expect(schema.gameReviews.status).toBeDefined()
    expect(schema.gameReviews.startedAt).toBeDefined()
    expect(schema.gameReviews.workerId).toBeDefined()
    expect(schema.gameReviews.lastHeartbeat).toBeDefined()
    expect(schema.gameReviews.completedAt).toBeDefined()
  })

  it('should have moveAnalyses table defined', () => {
    expect(schema.moveAnalyses).toBeDefined()
    expect(schema.moveAnalyses.reviewId).toBeDefined()
    expect(schema.moveAnalyses.moveNumber).toBeDefined()
    expect(schema.moveAnalyses.classification).toBeDefined()
    expect(schema.moveAnalyses.evaluation).toBeDefined()
    expect(schema.moveAnalyses.bestLine).toBeDefined()
  })
})
