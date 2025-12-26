import { Hono } from 'hono'
import { GameService } from '../game/game.service'
import { GameReviewService } from '../game/game-review.service'
import { authenticatedMiddleware } from '../middleware/auth'
import { workerMiddleware } from '../middleware/worker'

export const reviewRoutes = (gameService: GameService, gameReviewService: GameReviewService) => {
  const router = new Hono()

  router.post('/:gameId', authenticatedMiddleware, async (c) => {
    const gameId = c.req.param('gameId')
    const game = await gameService.getGame(gameId)
    if (!game) return c.json({ error: 'Game not found' }, 404)

    const review = await gameReviewService.requestReview(gameId)
    return c.json(review)
  })

  router.get('/:gameId', authenticatedMiddleware, async (c) => {
    const gameId = c.req.param('gameId')
    const game = await gameService.getGame(gameId)
    if (!game) return c.json({ error: 'Game not found' }, 404)

    const status = await gameReviewService.getReviewStatus(gameId)
    if (!status) return c.json({ error: 'Not found' }, 404)
    return c.json(status)
  })

  const worker = new Hono()
  worker.use('*', workerMiddleware)

  worker.post('/claim', async (c) => {
    try {
      const { workerId } = await c.req.json()
      const job = await gameReviewService.claimJob(workerId)
      if (!job) return c.json({ message: 'No jobs available' }, 200)
      return c.json(job)
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400)
    }
  })

  worker.post('/heartbeat', async (c) => {
    try {
      const { reviewId } = await c.req.json()
      await gameReviewService.heartbeat(reviewId)
      return c.json({ success: true })
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400)
    }
  })

  worker.post('/progress', async (c) => {
    try {
      const { reviewId, current, total } = await c.req.json()
      await gameReviewService.updateProgress(reviewId, current, total)
      return c.json({ success: true })
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400)
    }
  })

  worker.post('/submit', async (c) => {
    try {
      const { reviewId, results } = await c.req.json()
      await gameReviewService.submitResults(reviewId, results)
      return c.json({ success: true })
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400)
    }
  })

  worker.post('/failure', async (c) => {
    try {
      const { reviewId } = await c.req.json()
      await gameReviewService.reportFailure(reviewId)
      return c.json({ success: true })
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400)
    }
  })

  router.route('/worker', worker)

  return router
}
