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
import { GameLoopService } from './game/game-loop.service'
import { TournamentService } from './game/tournament.service'
import { TournamentLoopService } from './game/tournament-loop.service'
import { games, players, moves, llmConfigurations, tournaments, tournamentParticipants } from './db/schema'
import { desc, eq } from 'drizzle-orm'
import { auth } from './lib/auth'
import { adminMiddleware } from './middleware/admin'
import { workerMiddleware } from './middleware/worker'
import { authenticatedMiddleware } from './middleware/auth'
import { llmConfigService, LLMConfig } from './db/llm_config'
import { createNodeWebSocket } from '@hono/node-ws'
import { SocketService } from './game/socket.service'
import { logger } from './game/logger'
import { GameReviewService } from './game/game-review.service'

type Env = {
  Variables: {
    user: {
      id: string;
      email: string;
      name: string;
    };
    session: {
      id: string;
      userId: string;
      token: string;
      expiresAt: Date;
    };
  }
}

const app = new Hono<Env>()

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

app.use('*', cors())

// Initialize services
const gameManager = new GameManager()
const socketService = new SocketService()
const playerService = new PlayerService(db)
const tournamentService = new TournamentService(db)
const gameService = new GameService(db, gameManager, tournamentService, socketService)
const gameReviewService = new GameReviewService(db)

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
const STOCKFISH_LOW_ID = '00000000-0000-0000-0000-000000000010'
const STOCKFISH_MED_ID = '00000000-0000-0000-0000-000000000011'
const STOCKFISH_HIGH_ID = '00000000-0000-0000-0000-000000000012'
const STOCKFISH_VERY_HIGH_ID = '00000000-0000-0000-0000-000000000013'

export async function initializePlayers() {
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
        { id: STOCKFISH_LOW_ID, name: 'Stockfish (Low)', type: 'llm' as const, rating: 1500, provider: 'system' },
        { id: STOCKFISH_MED_ID, name: 'Stockfish (Medium)', type: 'llm' as const, rating: 2000, provider: 'system' },
        { id: STOCKFISH_HIGH_ID, name: 'Stockfish (High)', type: 'llm' as const, rating: 2500, provider: 'system' },
        { id: STOCKFISH_VERY_HIGH_ID, name: 'Stockfish (Very High)', type: 'llm' as const, rating: 3200, provider: 'system' },
    ]

    // 1. Ensure built-in players exist in 'players' table
    for (const p of builtinPlayers) {
        await db.insert(players).values({ ...p, peakRating: p.rating }).onConflictDoNothing()
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
    if (process.env.NODE_ENV !== 'test') {
        const allDbPlayers = await db.select().from(players)
        for (const p of allDbPlayers) {
            if (!activePlayerIds.includes(p.id)) {
                await db.delete(players).where(eq(players.id, p.id))
                console.log(`[Main] Deleted orphaned player profile: ${p.name} (${p.id})`)
            }
        }
    }

    // 5. Initialize active players in GameManager
    await playerService.initializeActivePlayers(gameManager)

    console.log('[Main] Player initialization complete.')
}

export const initPromise = initializePlayers().catch(console.error)

// Default LLM player for background loop (fallback) - will be overridden by registry
const defaultLlmPlayer = { 
    makeMove: async () => null, 
    getLastThinking: () => null 
}
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
    console.log(`[WebSocket] Upgrade request for gameId: ${gameId}`)

    return {
      onOpen(_event, ws) {
        console.log(`[WebSocket] Connection opened for gameId: ${gameId}`)
        if (gameId) {
          socketService.joinRoom(gameId, ws)
          // Trigger a loop check immediately but with a small delay to ensure connection is stable
          setTimeout(() => gameLoopService.advanceGame(gameId), 500)
        }
      },
      async onMessage(event) {
        try {
          const data = JSON.parse(event.data as string)
          if (data.type === 'SUBMIT_MOVE') {
            const { gameId: msgGameId, move } = data
            logger.info(`[WebSocket] Received SUBMIT_MOVE for game ${msgGameId}: ${move}`)

            // 1. Authorize the user
            const session = await auth.api.getSession({
              headers: c.req.raw.headers
            });

            if (!session) {
              logger.error(`[WebSocket] Unauthorized move attempt for game ${msgGameId}: No session`)
              return;
            }

            const game = await gameService.getGame(msgGameId)
            if (!game) {
              logger.error(`[WebSocket] Game ${msgGameId} not found`)
              return;
            }
            
            // Allow submission only if the user is one of the players
            if (game.whitePlayerId !== session.user.id && game.blackPlayerId !== session.user.id) {
              logger.error(`[WebSocket] Forbidden: User ${session.user.id} is not a player in game ${msgGameId}`)
              return;
            }

            // Allow submission if the game is ongoing
            if (game.status !== 'ongoing') {
              logger.error(`[WebSocket] Cannot submit move for game in status: ${game.status}`)
              return;
            }

            gameService.makeMove(msgGameId, move).then(() => {
              // Trigger loop advance immediately to handle next turn
              gameLoopService.advanceGame(msgGameId);
            }).catch(err => {
              logger.error(`[WebSocket] Failed to apply move from client: ${err.message}`)
            })
          }
        } catch (e) {
          logger.error('[WebSocket] Error processing message:', e)
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

app.delete('/api/games', adminMiddleware, async (c) => {
  try {
    await gameService.clearHistory()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500)
  }
})

app.delete('/api/games/:id', authenticatedMiddleware, async (c) => {
  const id = c.req.param('id')
  const user = c.get('user') as { id: string, email: string }
  
  const game = await gameService.getGame(id)
  if (!game) return c.json({ error: 'Game not found' }, 404)

  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = adminEmail && user.email === adminEmail

  if (!isAdmin && game.whitePlayerId !== user.id && game.blackPlayerId !== user.id) {
    return c.json({ error: 'Forbidden: You are not authorized to delete this game' }, 403)
  }

  try {
    await gameService.deleteGame(id)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500)
  }
})

app.post('/api/games', authenticatedMiddleware, async (c) => {
  const body = await c.req.json()
  const { whitePlayerId, blackPlayerId } = body
  
  try {
    const gameId = await gameService.createGame(whitePlayerId, blackPlayerId)
    return c.json({ id: gameId }, 201)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400)
  }
})

app.post('/api/games/:id/pause', authenticatedMiddleware, async (c) => {
  const id = c.req.param('id')
  const user = c.get('user') as { id: string, email: string }
  
  const game = await gameService.getGame(id)
  if (!game) return c.json({ error: 'Game not found' }, 404)

  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = adminEmail && user.email === adminEmail

  if (!isAdmin && game.whitePlayerId !== user.id && game.blackPlayerId !== user.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  try {
    await gameService.pauseGame(id)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400)
  }
})

app.post('/api/games/:id/resume', authenticatedMiddleware, async (c) => {
  const id = c.req.param('id')
  const user = c.get('user') as { id: string, email: string }
  
  const game = await gameService.getGame(id)
  if (!game) return c.json({ error: 'Game not found' }, 404)

  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = adminEmail && user.email === adminEmail

  if (!isAdmin && game.whitePlayerId !== user.id && game.blackPlayerId !== user.id) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  try {
    await gameService.resumeGame(id)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400)
  }
})

app.post('/api/games/:id/move', authenticatedMiddleware, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const { move, thinking } = body
  const user = c.get('user') as { id: string }

  const game = await gameService.getGame(id)
  if (!game) return c.json({ error: 'Game not found' }, 404)

  // Verify authorization: User must be one of the players (if players are human)
  if (game.whitePlayerId !== user.id && game.blackPlayerId !== user.id) {
    return c.json({ error: 'Forbidden: You are not a player in this game' }, 403)
  }
  
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

// Game Review Routes
app.post('/api/reviews/:gameId', authenticatedMiddleware, async (c) => {
  const gameId = c.req.param('gameId')
  const user = c.get('user') as { id: string, email: string }
  
  const game = await gameService.getGame(gameId)
  if (!game) return c.json({ error: 'Game not found' }, 404)

  // Only players or admins can request a review
  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = adminEmail && user.email === adminEmail
  
  if (!isAdmin && game.whitePlayerId !== user.id && game.blackPlayerId !== user.id) {
    return c.json({ error: 'Forbidden: You are not authorized to request a review for this game' }, 403)
  }

  const review = await gameReviewService.requestReview(gameId)
  return c.json(review)
})

app.get('/api/reviews/:gameId', authenticatedMiddleware, async (c) => {
  const gameId = c.req.param('gameId')
  const user = c.get('user') as { id: string, email: string }

  const game = await gameService.getGame(gameId)
  if (!game) return c.json({ error: 'Game not found' }, 404)

  // Only players or admins can view review status/results
  const adminEmail = process.env.ADMIN_EMAIL
  const isAdmin = adminEmail && user.email === adminEmail
  
  if (!isAdmin && game.whitePlayerId !== user.id && game.blackPlayerId !== user.id) {
    return c.json({ error: 'Forbidden: You are not authorized to view the review for this game' }, 403)
  }

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

app.route('/api/reviews/worker', worker)

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001
console.log(`Server is running on port ${port}`)

if (process.env.NODE_ENV !== 'test') {
  const server = serve({
    fetch: app.fetch,
    hostname: '0.0.0.0',
    port
  })
  injectWebSocket(server)
}

export default app
