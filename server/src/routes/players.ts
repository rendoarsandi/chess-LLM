import { Hono } from 'hono'
import { getDb } from '../db'
import { players } from '../db/schema'
import { desc } from 'drizzle-orm'
import { PlayerService } from '../game/player.service'
import { GameService } from '../game/game.service'

export const playerRoutes = (playerService: PlayerService, gameService: GameService) => {
  const router = new Hono()

  router.get('/', async (c) => {
    const allPlayers = await getDb().select().from(players)
    return c.json(allPlayers)
  })

  router.get('/leaderboard', async (c) => {
    const results = await getDb().select().from(players).orderBy(desc(players.rating))
    return c.json(results)
  })

  router.get('/:id/stats', async (c) => {
    const id = c.req.param('id')
    try {
      const stats = await gameService.getPlayerStats(id)
      return c.json(stats)
    } catch (e) {
      return c.json({ error: (e as Error).message }, 404)
    }
  })

  router.get('/:id/profile', async (c) => {
    const id = c.req.param('id')
    try {
      const profile = await playerService.getPlayerProfile(id)
      if (!profile) return c.json({ error: 'Player not found' }, 404)
      return c.json(profile)
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500)
    }
  })

  router.get('/:id/elo-history', async (c) => {
    const id = c.req.param('id')
    const period = c.req.query('period') || 'all'
    try {
      const history = await playerService.getEloHistory(id, period)
      return c.json(history)
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500)
    }
  })

  router.get('/:id/head-to-head', async (c) => {
    const id = c.req.param('id')
    try {
      const records = await playerService.getHeadToHead(id)
      return c.json(records)
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500)
    }
  })

  return router
}
