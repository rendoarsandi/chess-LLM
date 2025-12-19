import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { db } from './db'
import { GameManager } from './game/game-manager'
import { GameService } from './game/game.service'
import { RandomPlayer } from './game/random-player'
import { GeminiService } from './game/gemini.service'
import { GeminiPlayer } from './game/gemini-player'
import { GameLoopService } from './game/game-loop.service'
import { games, players, moves } from './db/schema'
import { desc, eq } from 'drizzle-orm'

const app = new Hono()

app.use('*', cors())

// Initialize services
const gameManager = new GameManager()
const gameService = new GameService(db, gameManager)

// Initialize players
const randomPlayer = new RandomPlayer()
let defaultLlmPlayer: any = randomPlayer

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
if (apiKey && apiKey !== 'your_api_key_here') {
  console.log('[Main] Gemini API Key found, initializing GeminiPlayer')
  const geminiService = new GeminiService(apiKey)
  defaultLlmPlayer = new GeminiPlayer(geminiService)
} else {
  console.warn('[Main] Gemini API Key not found or placeholder used. Falling back to RandomPlayer for LLM turns.')
}

const gameLoopService = new GameLoopService(db, gameService, defaultLlmPlayer)

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

app.get('/api/games/:id/moves', async (c) => {
  const id = c.req.param('id')
  const gameMoves = await db.select().from(moves).where(eq(moves.gameId, id)).orderBy(desc(moves.moveNumber))
  return c.json(gameMoves)
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
