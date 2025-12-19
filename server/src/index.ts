import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { db } from './db'
import { GameManager } from './game/game-manager'
import { GameService } from './game/game.service'
import { RandomPlayer } from './game/random-player'
import { GameLoopService } from './game/game-loop.service'
import { games, players } from './db/schema'
import { desc } from 'drizzle-orm'

const app = new Hono()

app.use('*', cors())

// Initialize services
const gameManager = new GameManager()
const gameService = new GameService(db, gameManager)
const randomPlayer = new RandomPlayer()
const gameLoopService = new GameLoopService(db, gameService, randomPlayer)

// Start background loop
gameLoopService.start(5000)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// API Routes
app.get('/api/games', async (c) => {
  const allGames = await db.select().from(games).orderBy(desc(games.createdAt))
  return c.json(allGames)
})

app.get('/api/games/:id', async (c) => {
  const id = c.req.param('id')
  const game = await gameService.getGame(id)
  if (!game) return c.json({ error: 'Game not found' }, 404)
  return c.json(game)
})

app.post('/api/games', async (c) => {
  const body = await c.req.json()
  const { whitePlayerId, blackPlayerId } = body
  
  try {
    const gameId = await gameService.createGame(whitePlayerId, blackPlayerId)
    return c.json({ id: gameId }, 201)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400)
  }
})

app.get('/api/players', async (c) => {
  const allPlayers = await db.select().from(players)
  return c.json(allPlayers)
})

const port = 3001
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})

export default app
