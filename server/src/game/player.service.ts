import { players, ratingHistory, games, llmConfigurations } from '../db/schema'
import { eq, or, and, gte } from 'drizzle-orm'
import { GameManager } from './game-manager'
import { GeminiService } from './gemini.service'
import { GeminiPlayer } from './gemini-player'
import { GroqService } from './groq.service'
import { GroqPlayer } from './groq-player'
import { RandomPlayer } from './random-player'
import { StockfishPlayer } from './stockfish-player'
import crypto from 'crypto'

export class PlayerService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private db: any) {}

  /**
   * Generates a deterministic UUID v5-like ID from a string
   */
  private generatePlayerId(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex').substring(0, 36);
  }

  async initializeActivePlayers(gameManager: GameManager) {
    const activeConfigs = await this.db.select().from(llmConfigurations).where(eq(llmConfigurations.isActive, true))
    
    for (const config of activeConfigs) {
        if (!config.playerId) continue;
        
        const player = this.createPlayerInstance(config)
        if (player) {
            gameManager.setPlayer(config.playerId, player)
            console.log(`[PlayerService] Initialized player: ${config.modelId} (${config.playerId})`)
        }
    }

    // Always ensure Random Bot and Stockfish exist (these are currently handled in index.ts but should move here)
    // For now, index.ts still does initial setup.
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createPlayerInstance(config: any) {
    const apiKey = config.apiKey || process.env[`${config.provider.toUpperCase()}_API_KEY`]
    
    if (!apiKey && config.provider !== 'stockfish' && config.provider !== 'random') {
        console.warn(`[PlayerService] No API key for ${config.modelId}, skipping instantiation`)
        return null
    }

    switch (config.provider.toLowerCase()) {
        case 'gemini':
            return new GeminiPlayer(new GeminiService(apiKey), config.modelId)
        case 'groq':
            return new GroqPlayer(new GroqService(apiKey), config.modelId)
        case 'random':
            return new RandomPlayer()
        case 'stockfish':
            // Stockfish config usually has ELO/Depth encoded or default
            return new StockfishPlayer(20, 2500, 18)
        default:
            return null
    }
  }

  async syncHardcodedConfigs(hardcoded: { provider: string, modelId: string, name?: string, rating?: number }[]) {
    const existingConfigs = await this.db.select().from(llmConfigurations)
    
    for (const hc of hardcoded) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = existingConfigs.find((c: any) => c.modelId === hc.modelId && c.provider === hc.provider)
        const playerId = this.generatePlayerId(`${hc.provider}-${hc.modelId}`)

        // 1. Ensure entry in players table first (satisfy FK)
        const playerEntry = await this.db.select().from(players).where(eq(players.id, playerId))
        if (playerEntry.length === 0) {
            await this.db.insert(players).values({
                id: playerId,
                name: hc.name || hc.modelId,
                type: 'llm',
                rating: hc.rating || 1500,
                peakRating: hc.rating || 1500,
                provider: hc.provider,
                version: hc.modelId
            })
        }

        // 2. Then sync llm_configurations
        if (!existing) {
            console.log(`[PlayerService] Registering new hardcoded model: ${hc.modelId}`)
            await this.db.insert(llmConfigurations).values({
                provider: hc.provider,
                modelId: hc.modelId,
                isActive: true,
                isHardcoded: true,
                playerId: playerId
            })
        } else if (!existing.playerId || existing.playerId !== playerId) {
            await this.db.update(llmConfigurations)
                .set({ playerId: playerId })
                .where(eq(llmConfigurations.id, existing.id))
        }
    }
  }

  async getPlayerProfile(playerId: string) {
    const result = await this.db.select().from(players).where(eq(players.id, playerId))
    return result[0]
  }

  async getEloHistory(playerId: string, period: string = 'all') {
    let query = this.db.select().from(ratingHistory).where(eq(ratingHistory.playerId, playerId))

    if (period !== 'all') {
      const days = parseInt(period, 10)
      if (!isNaN(days)) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        query = this.db.select().from(ratingHistory)
          .where(and(
            eq(ratingHistory.playerId, playerId),
            gte(ratingHistory.createdAt, cutoff)
          ))
      }
    }

    return await query.orderBy(ratingHistory.createdAt)
  }

  async getHeadToHead(playerId: string) {
    // Get all completed/draw games involving this player
    const playerGames = await this.db.select({
      id: games.id,
      whitePlayerId: games.whitePlayerId,
      blackPlayerId: games.blackPlayerId,
      status: games.status,
      winnerId: games.winnerId,
    })
    .from(games)
    .where(
      and(
        or(eq(games.whitePlayerId, playerId), eq(games.blackPlayerId, playerId)),
        or(eq(games.status, 'completed'), eq(games.status, 'draw'))
      )
    )

    // Aggregate records by opponent
    const records: Record<string, { opponentId: string, opponentName?: string, wins: number, losses: number, draws: number }> = {}

    for (const game of playerGames) {
      const isWhite = game.whitePlayerId === playerId
      const opponentId = isWhite ? game.blackPlayerId : game.whitePlayerId

      if (!records[opponentId]) {
        records[opponentId] = { opponentId, wins: 0, losses: 0, draws: 0 }
      }

      if (game.status === 'draw') {
        records[opponentId].draws++
      } else if (game.winnerId === playerId) {
        records[opponentId].wins++
      } else {
        records[opponentId].losses++
      }
    }

    // Add opponent names
    const headToHead = Object.values(records)
    for (const record of headToHead) {
      const opponent = await this.db.select({ name: players.name }).from(players).where(eq(players.id, record.opponentId))
      if (opponent[0]) {
        record.opponentName = opponent[0].name
      }
    }

    return headToHead
  }
}
