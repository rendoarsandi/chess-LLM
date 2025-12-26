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
import { getDb } from './db'
import { GameManager } from './game/game-manager'
import { GameService } from './game/game.service'
import { PlayerService } from './game/player.service'
import { GameLoopService } from './game/game-loop.service'
import { TournamentService } from './game/tournament.service'
import { TournamentLoopService } from './game/tournament-loop.service'
import { auth } from './lib/auth'
import { createNodeWebSocket } from '@hono/node-ws'
import { SocketService } from './game/socket.service'
import { logger } from './game/logger'
import { GameReviewService } from './game/game-review.service'
import { initializePlayers } from './game/player-init'

// Route imports
import { adminRoutes } from './routes/admin'
import { gameRoutes } from './routes/games'
import { playerRoutes } from './routes/players'
import { tournamentRoutes } from './routes/tournaments'
import { reviewRoutes } from './routes/reviews'

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
const playerService = new PlayerService(getDb())
const tournamentService = new TournamentService(getDb())
const gameService = new GameService(getDb(), gameManager, tournamentService, socketService)
const gameReviewService = new GameReviewService(getDb())

// BetterAuth integration
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw)
})

// Attach routes
app.route('/api/admin', adminRoutes(tournamentService))
app.route('/api/games', gameRoutes(gameService))
app.route('/api/players', playerRoutes(playerService, gameService))
app.route('/api/tournaments', tournamentRoutes(tournamentService))
app.route('/api/reviews', reviewRoutes(gameService, gameReviewService))

// Player Initialization
export let initPromise: Promise<void> | undefined
if (process.env.NODE_ENV !== 'test') {
  initPromise = initializePlayers(playerService, gameManager).catch(console.error)
}

// Background loops
const defaultLlmPlayer = { 
    makeMove: async () => null, 
    getLastThinking: () => null 
}
const gameLoopService = new GameLoopService(getDb(), gameService, defaultLlmPlayer, socketService)
const tournamentLoopService = new TournamentLoopService(getDb(), tournamentService, gameService)

if (process.env.NODE_ENV !== 'test') {
  gameLoopService.start(5000)
  tournamentLoopService.start(10000)
}

import { desc } from 'drizzle-orm'
import { players } from './db/schema'

app.get('/', (c) => c.text('Hello Hono!'))

app.get('/api/leaderboard', async (c) => {
  const results = await getDb().select().from(players).orderBy(desc(players.rating))
  return c.json(results)
})

app.get(
  '/ws',
  upgradeWebSocket((c) => {
    const gameId = c.req.query('gameId')
    return {
      onOpen(_event, ws) {
        if (gameId) {
          socketService.joinRoom(gameId, ws)
          setTimeout(() => gameLoopService.advanceGame(gameId), 500)
        }
      },
      async onMessage(event) {
        try {
          const data = JSON.parse(event.data as string)
          if (data.type === 'SUBMIT_MOVE') {
            const { gameId: msgGameId, move } = data
            const game = await gameService.getGame(msgGameId)
            if (!game || game.status !== 'ongoing') return

            gameService.makeMove(msgGameId, move).then(() => {
              gameLoopService.advanceGame(msgGameId);
            }).catch(err => {
              logger.error(`[WebSocket] Failed move: ${err.message}`)
            })
          }
        } catch (e) {
          logger.error('[WebSocket] Error:', e)
        }
      },
      onClose(event, ws) {
        if (gameId) socketService.leaveRoom(gameId, ws)
      },
    }
  })
)

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001
if (process.env.NODE_ENV !== 'test') {
  const server = serve({ fetch: app.fetch, hostname: '0.0.0.0', port })
  injectWebSocket(server)
  console.log(`Server is running on port ${port}`)
}

export default app