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
import { GameLoopService } from './game/game-loop.service'
import { StockfishPlayer } from './game/stockfish-player'
import { TournamentService } from './game/tournament.service'
import { TournamentLoopService } from './game/tournament-loop.service'
import { games, players, moves, llmConfigurations, tournaments, tournamentParticipants } from './db/schema'
import { desc, eq } from 'drizzle-orm'
import { auth } from './lib/auth'
import { adminMiddleware } from './middleware/admin'
import { llmConfigService, LLMConfig } from './db/llm_config'
import { createNodeWebSocket } from '@hono/node-ws'
import { SocketService } from './game/socket.service'

const app = new Hono()

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

app.use('*', cors())

// Initialize services
const gameManager = new GameManager()
const socketService = new SocketService()
const playerService = new PlayerService(db)
const tournamentService = new TournamentService(db)
const gameService = new GameService(db, gameManager, tournamentService, socketService)

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

admin.post('/tournaments', async (c) => {
  const body = await c.req.json()
  const { name, startTime, totalRounds, timeControlSettings, participantIds } = body
  
  try {
    const tournament = await tournamentService.createTournament({
      name,
      startTime: new Date(startTime),
      totalRounds,
      timeControlSettings
    })
    
    // Register participants
    for (const pid of participantIds) {
      await tournamentService.registerParticipant(tournament.id, pid)
    }
    
    return c.json(tournament, 201)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400)
  }
})

app.route('/api/admin', admin)

// System Player IDs (Hardcoded for core bots to preserve history)
const RANDOM_BOT_ID = '00000000-0000-0000-0000-000000000001'
const HUMAN_PLAYER_ID = '00000000-0000-0000-0000-000000000003'
const STOCKFISH_LOW_ID = '00000000-0000-0000-0000-000000000010'
const STOCKFISH_MED_ID = '00000000-0000-0000-0000-000000000011'
const STOCKFISH_HIGH_ID = '00000000-0000-0000-0000-000000000012'

// Initialize built-in non-LLM players
gameManager.setPlayer(RANDOM_BOT_ID, new RandomPlayer())
gameManager.setPlayer(STOCKFISH_LOW_ID, new StockfishPlayer(10, 1500, 14))
gameManager.setPlayer(STOCKFISH_MED_ID, new StockfishPlayer(20, 2000, 18))
gameManager.setPlayer(STOCKFISH_HIGH_ID, new StockfishPlayer(20, 3000, 22))

async function initializePlayers() {
    console.log('[Main] Synchronizing LLM configurations...')
    
    const hardcodedModels = [
        { provider: 'gemini', modelId: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', rating: 2500 },
        { provider: 'gemini', modelId: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', rating: 2300 },
        { provider: 'gemini', modelId: 'gemma-3-27b-it', name: 'Gemma 3 27B', rating: 2400 },
        { provider: 'gemini', modelId: 'gemma-3-12b-it', name: 'Gemma 3 12B', rating: 2100 },
        { provider: 'groq', modelId: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi k2', rating: 2600 },
        { provider: 'groq', modelId: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', rating: 2700 },
        { provider: 'groq', modelId: 'qwen/qwen3-32b', name: 'Qwen 3 32B', rating: 2550 },
    ]

    const builtinPlayers = [
        { id: RANDOM_BOT_ID, name: 'Random Bot', type: 'llm' as const, rating: 800 },
        { id: HUMAN_PLAYER_ID, name: 'Human', type: 'human' as const, rating: 1200 },
        { id: STOCKFISH_LOW_ID, name: 'Stockfish (Low)', type: 'llm' as const, rating: 1500 },
        { id: STOCKFISH_MED_ID, name: 'Stockfish (Mid)', type: 'llm' as const, rating: 2000 },
        { id: STOCKFISH_HIGH_ID, name: 'Stockfish (High)', type: 'llm' as const, rating: 3000 },
    ]

    // 1. Ensure built-in players exist in 'players' table
    for (const p of builtinPlayers) {
        const existing = await db.select().from(players).where(eq(players.id, p.id))
        if (existing.length === 0) {
            await db.insert(players).values({ ...p, peakRating: p.rating })
        }
    }

    // 2. Sync LLM configurations
    await playerService.syncHardcodedConfigs(hardcodedModels)
    
    // 3. Get all active IDs from configurations and builtin list
    const activeConfigs = await db.select().from(llmConfigurations)
    const activePlayerIds = [
        ...builtinPlayers.map(p => p.id),
        ...activeConfigs.filter((c: LLMConfig) => c.playerId).map((c: LLMConfig) => c.playerId)
    ] as string[]

    // 4. Remove any players NOT in the allowed list (orphaned test profiles)
    const allDbPlayers = await db.select().from(players)
    for (const p of allDbPlayers) {
        if (!activePlayerIds.includes(p.id)) {
            await db.delete(players).where(eq(players.id, p.id))
            console.log(`[Main] Deleted orphaned player profile: ${p.name} (${p.id})`)
        }
    }

    // 5. Initialize active players in GameManager
    await playerService.initializeActivePlayers(gameManager)

    console.log('[Main] Player initialization complete.')
}

export const initPromise = initializePlayers().catch(console.error)

// Default LLM player for background loop (fallback)
const defaultLlmPlayer = new RandomPlayer()
const gameLoopService = new GameLoopService(db, gameService, defaultLlmPlayer, socketService)
const tournamentLoopService = new TournamentLoopService(db, tournamentService, gameService)

// Start background loop
if (process.env.NODE_ENV !== 'test') {
  gameLoopService.start(5000)
  tournamentLoopService.start(10000)
}

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get(
  '/ws',
  upgradeWebSocket((c) => {
    const gameId = c.req.query('gameId')

    return {
      onOpen(event, ws) {
        if (gameId) {
          socketService.joinRoom(gameId, ws)
        }
      },
      onClose(event, ws) {
        if (gameId) {
          socketService.leaveRoom(gameId, ws)
        }
      },
    }
  })
)

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

app.get('/api/tournaments', async (c) => {
  const allTournaments = await db.select().from(tournaments).orderBy(desc(tournaments.createdAt))
  return c.json(allTournaments)
})

app.get('/api/tournaments/:id', async (c) => {
  const id = c.req.param('id')
  const tournament = await tournamentService.getTournament(id)
  if (!tournament) return c.json({ error: 'Tournament not found' }, 404)
  return c.json(tournament)
})

app.get('/api/tournaments/:id/participants', async (c) => {
  const id = c.req.param('id')
  const results = await db.select({
    id: players.id,
    name: players.name,
    type: players.type,
    rating: players.rating,
    wins: players.wins,
    losses: players.losses,
    draws: players.draws,
    peakRating: players.peakRating,
    score: tournamentParticipants.score,
    buchholz: tournamentParticipants.buchholz
  })
  .from(tournamentParticipants)
  .innerJoin(players, eq(tournamentParticipants.playerId, players.id))
  .where(eq(tournamentParticipants.tournamentId, id))
  .orderBy(desc(tournamentParticipants.score), desc(tournamentParticipants.buchholz))
  
  return c.json(results)
})

app.get('/api/tournaments/:id/games', async (c) => {
  const id = c.req.param('id')
  const results = await db.select().from(games).where(eq(games.tournamentId, id)).orderBy(desc(games.roundNumber), desc(games.createdAt))
  return c.json(results)
})

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001
console.log(`Server is running on port ${port}`)

if (process.env.NODE_ENV !== 'test') {
  const server = serve({
    fetch: app.fetch,
    port
  })
  injectWebSocket(server)
}

export default app
