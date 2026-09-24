/// <reference types="@cloudflare/workers-types" />

import { CloudflareEnv } from './env'
import { createD1Database } from '../db/d1'
import { GameManager } from '../game/game-manager'
import { GameService } from '../game/game.service'
import { PlayerService } from '../game/player.service'
import { SocketMessage, SocketService } from '../game/socket.service'
import { AppDatabase } from '../db/types'
import { games, moves, players } from '../db/schema'
import { eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'

type WebSocketMessageBody = string | ArrayBuffer

export class GameRoom {
  constructor(
    private state: DurableObjectState,
    private env: CloudflareEnv,
  ) {}

  async fetch(request: Request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const url = new URL(request.url)
    const gameId = url.searchParams.get('gameId') || 'lobby'
    await this.state.storage.put('gameId', gameId)

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.state.acceptWebSocket(server)
    this.broadcastSpectatorCount()

    // Kickstart AI match loops if gameId is not lobby
    if (gameId !== 'lobby') {
      this.state.blockConcurrencyWhile(async () => {
        const alarmTime = await this.state.storage.getAlarm()
        if (alarmTime === null) {
          await this.state.storage.setAlarm(Date.now() + 500)
        }
      })
    }

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(sender: WebSocket, message: WebSocketMessageBody) {
    const payload = typeof message === 'string' ? message : new TextDecoder().decode(message)

    try {
      const data = JSON.parse(payload)
      if (data.type === 'CHAT') {
        this.broadcast({
          type: 'CHAT',
          username: data.username || 'Anonymous Spectator',
          message: data.message,
          timestamp: Date.now(),
        })
      } else if (data.type === 'SUBMIT_MOVE') {
        const { gameId, move } = data
        const { gameService } = this.createServices()
        const game = await gameService.getGame(gameId)
        if (!game || game.status !== 'ongoing') return

        const result = await gameService.makeMove(gameId, move)
        this.broadcast({ type: 'UPDATE_TRIGGER' })

        // Trigger AI Commentary
        const db = createD1Database(this.env.DB)
        const whitePlayerTable = alias(players, 'whitePlayer')
        const blackPlayerTable = alias(players, 'blackPlayer')
        const fullGame = await db
          .select({
            whitePlayerName: whitePlayerTable.name,
            blackPlayerName: blackPlayerTable.name,
          })
          .from(games)
          .where(eq(games.id, gameId))
          .leftJoin(whitePlayerTable, eq(games.whitePlayerId, whitePlayerTable.id))
          .leftJoin(blackPlayerTable, eq(games.blackPlayerId, blackPlayerTable.id))
          .then((res) => res[0])

        if (fullGame) {
          this.triggerCommentary(db, { ...fullGame, id: gameId }, result.san, result.fen, result.pgn)
        }

        // Advance loop
        await this.state.storage.setAlarm(Date.now() + 200)
      }
    } catch {
      // Broadcast standard websocket payloads to peers
      for (const socket of this.state.getWebSockets()) {
        if (socket !== sender) {
          socket.send(payload)
        }
      }
    }
  }

  async webSocketClose() {
    this.broadcastSpectatorCount()
  }

  async webSocketError() {
    this.broadcastSpectatorCount()
  }

  async alarm() {
    const gameId = await this.state.storage.get<string>('gameId')
    if (gameId && gameId !== 'lobby') {
      await this.advanceGame(gameId)
    }
  }

  private broadcast(payload: SocketMessage) {
    const sockets = this.state.getWebSockets()
    const str = JSON.stringify(payload)
    for (const socket of sockets) {
      socket.send(str)
    }
  }

  private broadcastSpectatorCount() {
    const sockets = this.state.getWebSockets()
    this.broadcast({ type: 'SPECTATORS', count: sockets.length })
  }

  private createServices() {
    // Inject edge API credentials into process.env so existing DB and player models compile
    process.env.GEMINI_API_KEY = this.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY
    process.env.GROQ_API_KEY = this.env.GROQ_API_KEY || process.env.GROQ_API_KEY
    process.env.OPENROUTER_API_KEY = this.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY
    process.env.OPENROUTER_HTTP_REFERER = this.env.OPENROUTER_HTTP_REFERER || process.env.OPENROUTER_HTTP_REFERER
    process.env.OPENROUTER_APP_TITLE = this.env.OPENROUTER_APP_TITLE || process.env.OPENROUTER_APP_TITLE

    const db = createD1Database(this.env.DB)
    const gameManager = new GameManager()
    const playerService = new PlayerService(db)

    const socketServiceMock = {
      broadcast: (_gid: string, payload: SocketMessage) => {
        this.broadcast(payload)
      },
      joinRoom: () => {},
      leaveRoom: () => {},
    } as unknown as SocketService

    const gameService = new GameService(db, gameManager, undefined, socketServiceMock)
    return { db, gameManager, playerService, gameService }
  }

  private async advanceGame(gameId: string) {
    const { db, gameManager, playerService, gameService } = this.createServices()

    // Load active bot configurations dynamically inside the DO
    await playerService.initializeActivePlayers(gameManager)

    const whitePlayerTable = alias(players, 'whitePlayer')
    const blackPlayerTable = alias(players, 'blackPlayer')

    const gameResults = await db
      .select({
        id: games.id,
        fen: games.fen,
        variant: games.variant,
        status: games.status,
        whitePlayerId: games.whitePlayerId,
        blackPlayerId: games.blackPlayerId,
        whitePlayerType: whitePlayerTable.type,
        blackPlayerType: blackPlayerTable.type,
        whitePlayerName: whitePlayerTable.name,
        blackPlayerName: blackPlayerTable.name,
        updatedAt: games.updatedAt,
        pgn: games.pgn,
      })
      .from(games)
      .where(eq(games.id, gameId))
      .leftJoin(whitePlayerTable, eq(games.whitePlayerId, whitePlayerTable.id))
      .leftJoin(blackPlayerTable, eq(games.blackPlayerId, blackPlayerTable.id))

    if (gameResults.length === 0) return
    const game = gameResults[0]

    if (game.status !== 'ongoing') {
      return
    }

    const turn = game.fen.split(' ')[1]
    const currentPlayerType = turn === 'w' ? game.whitePlayerType : game.blackPlayerType
    const currentPlayerId = turn === 'w' ? game.whitePlayerId : game.blackPlayerId

    const STOCKFISH_LOW_ID = '00000000-0000-0000-0000-000000000010'
    const STOCKFISH_MED_ID = '00000000-0000-0000-0000-000000000011'
    const STOCKFISH_HIGH_ID = '00000000-0000-0000-0000-000000000012'
    const STOCKFISH_VERY_HIGH_ID = '00000000-0000-0000-0000-000000000013'

    const STOCKFISH_IDS = [
      STOCKFISH_LOW_ID,
      STOCKFISH_MED_ID,
      STOCKFISH_HIGH_ID,
      STOCKFISH_VERY_HIGH_ID,
    ]

    if (currentPlayerType === 'human') {
      return
    }

    if (currentPlayerId && STOCKFISH_IDS.includes(currentPlayerId)) {
      let constraints = { depth: 18, skillLevel: 20, movetime: 1000 }
      if (currentPlayerId === STOCKFISH_LOW_ID) {
        constraints = { depth: 6, skillLevel: 12, movetime: 500 }
      } else if (currentPlayerId === STOCKFISH_MED_ID) {
        constraints = { depth: 8, skillLevel: 15, movetime: 1000 }
      } else if (currentPlayerId === STOCKFISH_HIGH_ID) {
        constraints = { depth: 10, skillLevel: 18, movetime: 1500 }
      } else if (currentPlayerId === STOCKFISH_VERY_HIGH_ID) {
        constraints = { depth: 22, skillLevel: 20, movetime: 3000 }
      }

      this.broadcast({
        type: 'REQUEST_MOVE',
        gameId: game.id,
        fen: game.fen,
        constraints,
      })

      await this.state.storage.setAlarm(Date.now() + 3000)
      return
    }

    this.broadcast({ type: 'STATUS', status: 'thinking' })

    const gameMoves = await db
      .select()
      .from(moves)
      .where(eq(moves.gameId, game.id))
      .orderBy(moves.moveNumber)

    const history = gameMoves.map((m: { move: string }) => m.move)
    const player = gameService.getPlayer(currentPlayerId!)

    if (!player) {
      console.error(`[DO] Player instance not found for ID: ${currentPlayerId}`)
      await this.state.storage.setAlarm(Date.now() + 5000)
      return
    }

    const startTime = Date.now()
    let move = null
    try {
      move = await player.makeMove(game.fen, history, game.variant)
    } catch (e) {
      console.error(`[DO] Error calling makeMove:`, e)
    }
    const thinkingMs = Date.now() - startTime

    if (move) {
      try {
        const thinking = player.getLastThinking ? player.getLastThinking() : {}
        const result = await gameService.makeMove(game.id, move, { ...thinking, thinkingMs })
        console.log(`[DO] Bot move registered: ${result.san}`)

        // Trigger Commentary
        await this.triggerCommentary(db, game, result.san, result.fen, result.pgn)

        await this.state.storage.setAlarm(Date.now() + 200)
      } catch (e) {
        console.error(`[DO] Error applying bot move:`, e)
        await this.state.storage.setAlarm(Date.now() + 4000)
      }
    } else {
      console.warn(`[DO] Bot failed to generate move, retrying...`)
      await this.state.storage.setAlarm(Date.now() + 4000)
    }
  }

  private async triggerCommentary(
    db: AppDatabase,
    game: { id: string; whitePlayerName: string | null; blackPlayerName: string | null },
    san: string,
    fen: string,
    pgn: string,
  ) {
    const apiKey = this.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) return

    try {
      const { CommentaryService } = await import('../game/commentary.service')
      const { GeminiService } = await import('../game/gemini.service')

      const service = new GeminiService(apiKey)
      const commentaryService = new CommentaryService(service, 'gemini-2.5-flash')

      const text = await commentaryService.generateCommentary({
        san,
        fen,
        pgn,
        whitePlayer: game.whitePlayerName || 'White Bot',
        blackPlayer: game.blackPlayerName || 'Black Bot',
      })

      if (text) {
        this.broadcast({
          type: 'CHAT',
          username: 'AI Commentator (Gemini)',
          message: text,
          timestamp: Date.now(),
        })
      }
    } catch (e) {
      console.error('[DO] Failed to run AI commentary:', e)
    }
  }
}
