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

// System Player IDs
const RANDOM_BOT_ID = '00000000-0000-0000-0000-000000000001'
const GEMINI_3_0_ID = '00000000-0000-0000-0000-000000000002'
const GEMINI_2_5_ID = '00000000-0000-0000-0000-000000000004'
const HUMAN_PLAYER_ID = '00000000-0000-0000-0000-000000000003'

// Initialize players
const randomPlayer = new RandomPlayer()
gameManager.setPlayer(RANDOM_BOT_ID, randomPlayer)

let defaultLlmPlayer: any = randomPlayer

const apiKey = process.env.GEMINI_API_KEY
if (apiKey && apiKey !== 'your_api_key_here') {
  console.log('[Main] Gemini API Key found, initializing GeminiPlayers')
  const geminiService = new GeminiService(apiKey)
  
  const gemini30Player = new GeminiPlayer(geminiService, 'gemini-3.0-flash')
  const gemini25Player = new GeminiPlayer(geminiService, 'gemini-2.5-flash')
  
  defaultLlmPlayer = gemini30Player
  gameManager.setPlayer(GEMINI_3_0_ID, gemini30Player)
  gameManager.setPlayer(GEMINI_2_5_ID, gemini25Player)
} else {
  console.warn('[Main] Gemini API Key not found or placeholder used. Falling back to RandomPlayer for LLM turns.')
  gameManager.setPlayer(GEMINI_3_0_ID, randomPlayer)
  gameManager.setPlayer(GEMINI_2_5_ID, randomPlayer)
}

// Ensure system players exist in DB
async function ensureSystemPlayers() {
  const existing = await db.select().from(players)
  const existingIds = existing.map(p => p.id)

  const systemPlayers = [
    { id: RANDOM_BOT_ID, name: 'Random Bot', type: 'llm' as const },
    { id: GEMINI_3_0_ID, name: 'Gemini 3.0 Flash', type: 'llm' as const },
    { id: GEMINI_2_5_ID, name: 'Gemini 2.5 Flash', type: 'llm' as const },
    { id: HUMAN_PLAYER_ID, name: 'Human', type: 'human' as const },
  ]

  for (const p of systemPlayers) {
    if (!existingIds.includes(p.id)) {
      await db.insert(players).values(p)
      console.log(`[Main] Created system player: ${p.name}`)
    }
  }
}

ensureSystemPlayers().catch(console.error)

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

app.delete('/api/games', async (c) => {
  try {
    await gameService.clearHistory()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500)
  }
})

app.delete('/api/games/:id', async (c) => {
  const id = c.req.param('id')
  try {
    await gameService.deleteGame(id)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500)
  }
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

app.post('/api/games/:id/move', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const { move, thinking } = body
  
  try {
    const result = await gameService.makeMove(id, move, thinking)
    return c.json(result)
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
