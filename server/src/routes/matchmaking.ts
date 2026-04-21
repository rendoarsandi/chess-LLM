import { Hono } from 'hono'
import { MatchmakingService } from '../game/matchmaking.service'

export const matchmakingRoutes = (matchmakingService: MatchmakingService) => {
  const router = new Hono()

  router.get('/status', async (c) => {
    const variant = c.req.query('variant') === 'chess960' ? 'chess960' : 'standard'
    return c.json(await matchmakingService.getStatus(variant))
  })

  return router
}
