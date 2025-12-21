import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from project root (two levels up from server/src/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { db } from './db'
import { GameManager } from './game/game-manager'
import { GameService } from './game/game.service'
import { PlayerService } from './game/player.service'
import { RandomPlayer } from './game/random-player'
import { GeminiService } from './game/gemini.service'
import { GeminiPlayer } from './game/gemini-player'
import { GroqService } from './game/groq.service'
import { GroqPlayer } from './game/groq-player'
import { GameLoopService } from './game/game-loop.service'
import { games, players, moves } from './db/schema'
import { desc, eq, sql } from 'drizzle-orm'
import { auth } from './lib/auth'
import { adminMiddleware } from './middleware/admin'
import { llmConfigService } from './db/llm_config'

const app = new Hono()

app.use('*', cors())

// BetterAuth integration
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw)
})

// Admin Routes
const admin = new Hono()
admin.use('*', adminMiddleware)

admin.get('/models', async (c) => {
  const configs = await llmConfigService.getAllConfigs()
  return c.json(configs)
})

admin.post('/models', async (c) => {
  const body = await c.req.json()
  const config = await llmConfigService.createConfig(body)
  return c.json(config, 201)
})

admin.patch('/models/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const config = await llmConfigService.updateConfig(id, body)
  if (!config) return c.json({ error: 'Not found' }, 404)
  return c.json(config)
})

admin.delete('/models/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const result = await llmConfigService.deleteConfig(id)
  if (!result) return c.json({ error: 'Not found' }, 404)
  return c.json({ success: true })
})

app.route('/api/admin', admin)

// Initialize services
const gameManager = new GameManager()
const gameService = new GameService(db, gameManager)
const playerService = new PlayerService(db)

// System Player IDs
const RANDOM_BOT_ID = '00000000-0000-0000-0000-000000000001'
const GEMINI_3_0_ID = '00000000-0000-0000-0000-000000000002'
const GEMINI_2_5_ID = '00000000-0000-0000-0000-000000000004'
const GEMMA_3_27B_ID = '00000000-0000-0000-0000-000000000005'
const GEMMA_3_12B_ID = '00000000-0000-0000-0000-000000000006'
const HUMAN_PLAYER_ID = '00000000-0000-0000-0000-000000000003'
const STOCKFISH_LOW_ID = '00000000-0000-0000-0000-000000000010'
const STOCKFISH_MED_ID = '00000000-0000-0000-0000-000000000011'
const STOCKFISH_HIGH_ID = '00000000-0000-0000-0000-000000000012'
const KIMI_ID = '00000000-0000-0000-0000-000000000020'
const GPT_OSS_ID = '00000000-0000-0000-0000-000000000021'
const QWEN_ID = '00000000-0000-0000-0000-000000000022'

// Initialize players
const randomPlayer = new RandomPlayer()
gameManager.setPlayer(RANDOM_BOT_ID, randomPlayer)

import { StockfishPlayer } from './game/stockfish-player'
const stockfishLow = new StockfishPlayer(10, 1500, 14) // Skill Level 10, 1500 ELO, Depth 14
const stockfishMed = new StockfishPlayer(20, 2000, 18) // Skill Level 20, 2000 ELO, Depth 18
const stockfishHigh = new StockfishPlayer(20, 3000, 22) // Skill Level 20, 3000 ELO, Depth 22

gameManager.setPlayer(STOCKFISH_LOW_ID, stockfishLow)
gameManager.setPlayer(STOCKFISH_MED_ID, stockfishMed)
gameManager.setPlayer(STOCKFISH_HIGH_ID, stockfishHigh)

let defaultLlmPlayer: any = randomPlayer

const geminiApiKey = process.env.GEMINI_API_KEY
if (geminiApiKey && geminiApiKey !== 'your_api_key_here') {
  console.log('[Main] Gemini API Key found, initializing GeminiPlayers')
  const geminiService = new GeminiService(geminiApiKey)
  
  const gemini30Player = new GeminiPlayer(geminiService, 'gemini-3-flash-preview')
  const gemini25Player = new GeminiPlayer(geminiService, 'gemini-2.5-flash')
  const gemma27bPlayer = new GeminiPlayer(geminiService, 'gemma-3-27b-it')
  const gemma12bPlayer = new GeminiPlayer(geminiService, 'gemma-3-12b-it')
  
  defaultLlmPlayer = gemini30Player
  gameManager.setPlayer(GEMINI_3_0_ID, gemini30Player)
  gameManager.setPlayer(GEMINI_2_5_ID, gemini25Player)
  gameManager.setPlayer(GEMMA_3_27B_ID, gemma27bPlayer)
  gameManager.setPlayer(GEMMA_3_12B_ID, gemma12bPlayer)
} else {
  console.error('[CRITICAL] Gemini API Key NOT FOUND in .env')
}

const groqApiKey = process.env.GROQ_API_KEY
if (groqApiKey && groqApiKey !== 'your_api_key_here') {
  console.log('[Main] Groq API Key found, initializing GroqPlayers')
  const groqService = new GroqService(groqApiKey)
  
  const kimiPlayer = new GroqPlayer(groqService, 'moonshotai/kimi-k2-instruct-0905')
  const gptOssPlayer = new GroqPlayer(groqService, 'openai/gpt-oss-120b')
  const qwenPlayer = new GroqPlayer(groqService, 'qwen/qwen3-32b')
  
  gameManager.setPlayer(KIMI_ID, kimiPlayer)
  gameManager.setPlayer(GPT_OSS_ID, gptOssPlayer)
  gameManager.setPlayer(QWEN_ID, qwenPlayer)
} else {
  console.log('[Main] Groq API Key NOT FOUND in .env')
}

// Ensure system players exist in DB and remove others
async function ensureSystemPlayers() {
  const systemPlayers = [
    { id: RANDOM_BOT_ID, name: 'Random Bot', type: 'llm' as const, rating: 800 },
    { id: GEMINI_3_0_ID, name: 'Gemini 3 Flash', type: 'llm' as const, rating: 2500 },
    { id: GEMINI_2_5_ID, name: 'Gemini 2.5 Flash', type: 'llm' as const, rating: 2300 },
    { id: GEMMA_3_27B_ID, name: 'Gemma 3 27B', type: 'llm' as const, rating: 2400 },
    { id: GEMMA_3_12B_ID, name: 'Gemma 3 12B', type: 'llm' as const, rating: 2100 },
    { id: HUMAN_PLAYER_ID, name: 'Human', type: 'human' as const, rating: 1200 },
    { id: STOCKFISH_LOW_ID, name: 'Stockfish (Low)', type: 'llm' as const, rating: 1500 },
    { id: STOCKFISH_MED_ID, name: 'Stockfish (Mid)', type: 'llm' as const, rating: 2000 },
    { id: STOCKFISH_HIGH_ID, name: 'Stockfish (High)', type: 'llm' as const, rating: 3000 },
    { id: KIMI_ID, name: 'Kimi k2', type: 'llm' as const, rating: 2600 },
    { id: GPT_OSS_ID, name: 'GPT-OSS 120B', type: 'llm' as const, rating: 2700 },
    { id: QWEN_ID, name: 'Qwen 3 32B', type: 'llm' as const, rating: 2550 },
  ]

  const systemIds = systemPlayers.map(p => p.id)

  // Remove any players NOT in the system list (like test P1, P2)
  const allPlayers = await db.select().from(players)
  for (const p of allPlayers) {
    if (!systemIds.includes(p.id)) {
      await db.delete(players).where(eq(players.id, p.id))
      console.log(`[Main] Deleted non-system player: ${p.name}`)
    }
  }

  const existing = await db.select().from(players)
  const existingIds = existing.map(p => p.id)

  for (const p of systemPlayers) {
    if (!existingIds.includes(p.id)) {
      await db.insert(players).values({ ...p, peakRating: p.rating })
      console.log(`[Main] Created system player: ${p.name}`)
    } else {
      // Update name and rating if it exists but differs
      await db.update(players).set({ 
        name: p.name,
        rating: p.rating,
        peakRating: sql`MAX(peak_rating, ${p.rating})`
      }).where(eq(players.id, p.id))
    }
  }
}

export const initPromise = ensureSystemPlayers().catch(console.error)

const gameLoopService = new GameLoopService(db, gameService, defaultLlmPlayer)

// Start background loop
if (process.env.NODE_ENV !== 'test') {
  gameLoopService.start(5000)
}

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
  const gameId = c.req.param('id')
  const results = await db.select().from(moves).where(eq(moves.gameId, gameId)).orderBy(moves.id)
  return c.json(results)
})

app.get('/api/leaderboard', async (c) => {
  const results = await db.select().from(players).orderBy(desc(players.rating))
  return c.json(results)
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

app.post('/api/games/:id/pause', async (c) => {
  const id = c.req.param('id')
  try {
    await gameService.pauseGame(id)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400)
  }
})

app.post('/api/games/:id/resume', async (c) => {
  const id = c.req.param('id')
  try {
    await gameService.resumeGame(id)
    return c.json({ success: true })
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

app.get('/api/players/:id/stats', async (c) => {
  const id = c.req.param('id')
  try {
    const stats = await gameService.getPlayerStats(id)
    return c.json(stats)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 404)
  }
})

app.get('/api/players/:id/profile', async (c) => {
  const id = c.req.param('id')
  try {
    const profile = await playerService.getPlayerProfile(id)
    if (!profile) return c.json({ error: 'Player not found' }, 404)
    return c.json(profile)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500)
  }
})

app.get('/api/players/:id/elo-history', async (c) => {
  const id = c.req.param('id')
  const period = c.req.query('period') || 'all'
  try {
    const history = await playerService.getEloHistory(id, period)
    return c.json(history)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500)
  }
})

app.get('/api/players/:id/head-to-head', async (c) => {
  const id = c.req.param('id')
  try {
    const records = await playerService.getHeadToHead(id)
    return c.json(records)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500)
  }
})

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001
console.log(`Server is running on port ${port}`)

if (process.env.NODE_ENV !== 'test') {
  serve({
    fetch: app.fetch,
    port
  })
}

export default app
