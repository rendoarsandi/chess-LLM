/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { desc, eq } from 'drizzle-orm'
import { createD1Database } from '../db/d1'
import { games, moves, players } from '../db/schema'
import { GameManager } from '../game/game-manager'
import { GameService } from '../game/game.service'
import { MatchmakingService } from '../game/matchmaking.service'
import { PlayerService } from '../game/player.service'
import { CloudflareEnv, cloudflareMatchmakingConfig } from './env'
import { GameRoom } from './game-room'
import { ArenaScheduler } from './arena-scheduler'

type WorkerHonoEnv = {
  Bindings: CloudflareEnv
}

function createServices(env: CloudflareEnv) {
  const db = createD1Database(env.DB)
  const gameService = new GameService(db, new GameManager())
  const playerService = new PlayerService(db)
  const matchmakingService = new MatchmakingService(
    db,
    gameService,
    cloudflareMatchmakingConfig(env),
  )

  return { db, gameService, playerService, matchmakingService }
}

function requireAdminToken(c: {
  env: CloudflareEnv
  req: { header: (name: string) => string | undefined }
}) {
  if (!c.env.ADMIN_API_TOKEN) return false
  return c.req.header('x-admin-token') === c.env.ADMIN_API_TOKEN
}

const app = new Hono<WorkerHonoEnv>()
app.use('*', cors())

app.get('/', (c) => c.text('ChessLLM Arena Worker'))

app.get('/api/leaderboard', async (c) => {
  const { db } = createServices(c.env)
  return c.json(await db.select().from(players).orderBy(desc(players.rating)))
})

app.get('/api/players', async (c) => {
  const { db } = createServices(c.env)
  return c.json(await db.select().from(players))
})

app.get('/api/players/:id/profile', async (c) => {
  const { playerService } = createServices(c.env)
  const player = await playerService.getPlayerProfile(c.req.param('id'))
  if (!player) return c.json({ error: 'Player not found' }, 404)
  return c.json(player)
})

app.get('/api/games', async (c) => {
  const { db } = createServices(c.env)
  return c.json(await db.select().from(games).orderBy(desc(games.createdAt)))
})

app.get('/api/games/:id', async (c) => {
  const { gameService } = createServices(c.env)
  const game = await gameService.getGame(c.req.param('id'))
  if (!game) return c.json({ error: 'Game not found' }, 404)
  return c.json(game)
})

app.get('/api/games/:id/moves', async (c) => {
  const { db } = createServices(c.env)
  return c.json(
    await db
      .select()
      .from(moves)
      .where(eq(moves.gameId, c.req.param('id')))
      .orderBy(moves.id),
  )
})

app.get('/api/matchmaking/status', async (c) => {
  const { matchmakingService } = createServices(c.env)
  const variant = c.req.query('variant') === 'chess960' ? 'chess960' : 'standard'
  return c.json(await matchmakingService.getStatus(variant))
})

app.post('/api/admin/matchmaking/run', async (c) => {
  if (!requireAdminToken(c)) return c.json({ error: 'Unauthorized' }, 401)

  const { matchmakingService } = createServices(c.env)
  const body = (await c.req.json().catch(() => ({}))) as { variant?: string }
  const variant = body.variant === 'chess960' ? 'chess960' : 'standard'
  const result = await matchmakingService.createNextMatch({ variant })

  if (result.created) return c.json(result, 201)
  return c.json(result, 409)
})

app.post('/api/admin/matchmaking/scheduler/start', async (c) => {
  if (!requireAdminToken(c)) return c.json({ error: 'Unauthorized' }, 401)

  const schedulerId = c.env.ARENA_SCHEDULER.idFromName('arena')
  const scheduler = c.env.ARENA_SCHEDULER.get(schedulerId)
  return scheduler.fetch(new Request(new URL('/start', c.req.url), { method: 'POST' }))
})

app.get('/ws', async (c) => {
  const gameId = c.req.query('gameId') || 'lobby'
  const roomId = c.env.GAME_ROOM.idFromName(gameId)
  const room = c.env.GAME_ROOM.get(roomId)
  return room.fetch(c.req.raw)
})

export { GameRoom, ArenaScheduler }

export default {
  fetch: app.fetch,
}
