import { Hono } from 'hono'
import { getDb } from '../db'
import { games, moves } from '../db/schema'
import { desc, eq } from 'drizzle-orm'
import { GameService } from '../game/game.service'
import { adminMiddleware } from '../middleware/admin'
import { authenticatedMiddleware } from '../middleware/auth'

export const gameRoutes = (gameService: GameService) => {
  const router = new Hono()

  router.get('/', async (c) => {
    const allGames = await getDb().select().from(games).orderBy(desc(games.createdAt))
    return c.json(allGames)
  })

  router.get('/:id', async (c) => {
    const id = c.req.param('id')
    const game = await gameService.getGame(id)
    if (!game) return c.json({ error: 'Game not found' }, 404)
    return c.json(game)
  })

  router.get('/:id/moves', async (c) => {
    const gameId = c.req.param('id')
    const results = await getDb().select().from(moves).where(eq(moves.gameId, gameId)).orderBy(moves.id)
    return c.json(results)
  })

  router.delete('/', adminMiddleware, async (c) => {
    try {
      await gameService.clearHistory()
      return c.json({ success: true })
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500)
    }
  })

  router.delete('/:id', authenticatedMiddleware, async (c) => {
    const id = c.req.param('id')
    const game = await gameService.getGame(id)
    if (!game) return c.json({ error: 'Game not found' }, 404)

    try {
      await gameService.deleteGame(id)
      return c.json({ success: true })
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500)
    }
  })

  router.post('/', authenticatedMiddleware, async (c) => {
    const body = await c.req.json()
    const { whitePlayerId, blackPlayerId, ...options } = body
    
    try {
      const gameId = await gameService.createGame(whitePlayerId, blackPlayerId, options)
      return c.json({ id: gameId }, 201)
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400)
    }
  })

  router.post('/:id/pause', authenticatedMiddleware, async (c) => {
    const id = c.req.param('id')
    const game = await gameService.getGame(id)
    if (!game) return c.json({ error: 'Game not found' }, 404)

    try {
      await gameService.pauseGame(id)
      return c.json({ success: true })
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400)
    }
  })

  router.post('/:id/resume', authenticatedMiddleware, async (c) => {
    const id = c.req.param('id')
    const game = await gameService.getGame(id)
    if (!game) return c.json({ error: 'Game not found' }, 404)

    try {
      await gameService.resumeGame(id)
      return c.json({ success: true })
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400)
    }
  })

  router.post('/:id/move', authenticatedMiddleware, async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { move, thinking } = body

    const game = await gameService.getGame(id)
    if (!game) return c.json({ error: 'Game not found' }, 404)

    try {
      const result = await gameService.makeMove(id, move, thinking)
      return c.json(result)
    } catch (e) {
      return c.json({ error: (e as Error).message }, 400)
    }
  })

  return router
}
