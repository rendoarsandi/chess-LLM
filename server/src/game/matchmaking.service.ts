import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { games, llmConfigurations, players } from '../db/schema'
import { AppDatabase } from '../db/types'
import { GameService } from './game.service'

type MatchmakingVariant = 'standard' | 'chess960'

export type MatchmakingPlayer = {
  id: string
  name: string
  provider: string | null
  modelId: string | null
  rating: number
  rating960: number
}

export type MatchmakingPair = {
  white: MatchmakingPlayer
  black: MatchmakingPlayer
  variant: MatchmakingVariant
  gamesPlayed: number
  ratingGap: number
  reason: string
}

export type MatchmakingStatus = {
  enabled: boolean
  intervalMs: number
  variant: MatchmakingVariant
  ongoingGames: number
  eligiblePlayers: MatchmakingPlayer[]
  nextPair: MatchmakingPair | null
}

export type MatchmakingRunResult =
  | { created: true; gameId: string; pair: MatchmakingPair }
  | { created: false; reason: string; status: MatchmakingStatus }

type PairStats = {
  gamesPlayed: number
  lastPlayedAt: Date | null
  whiteCounts: Record<string, number>
}

const DEFAULT_INTERVAL_MS = 60000

type MatchmakingConfig = {
  enabled?: boolean
  intervalMs?: number
  variant?: MatchmakingVariant
}

export class MatchmakingService {
  constructor(
    private db: AppDatabase,
    private gameService: GameService,
    private config: MatchmakingConfig = {},
  ) {}

  isEnabled() {
    if (this.config.enabled !== undefined) return this.config.enabled
    return process.env.MATCHMAKING_ENABLED === 'true'
  }

  getIntervalMs() {
    if (this.config.intervalMs && this.config.intervalMs >= 5000) return this.config.intervalMs
    const configured = Number(process.env.MATCHMAKING_INTERVAL_MS)
    return Number.isFinite(configured) && configured >= 5000 ? configured : DEFAULT_INTERVAL_MS
  }

  getVariant(): MatchmakingVariant {
    if (this.config.variant) return this.config.variant
    return process.env.MATCHMAKING_VARIANT === 'chess960' ? 'chess960' : 'standard'
  }

  async getStatus(variant: MatchmakingVariant = this.getVariant()): Promise<MatchmakingStatus> {
    const [ongoingGames, eligiblePlayers, nextPair] = await Promise.all([
      this.countOngoingArenaGames(),
      this.getEligiblePlayers(),
      this.getNextPair(variant),
    ])

    return {
      enabled: this.isEnabled(),
      intervalMs: this.getIntervalMs(),
      variant,
      ongoingGames,
      eligiblePlayers,
      nextPair,
    }
  }

  async createNextMatch(
    options: { variant?: MatchmakingVariant; force?: boolean } = {},
  ): Promise<MatchmakingRunResult> {
    const variant = options.variant || this.getVariant()
    const status = await this.getStatus(variant)

    if (!options.force && status.ongoingGames > 0) {
      return {
        created: false,
        reason: 'An arena game is already ongoing; matchmaking will wait.',
        status,
      }
    }

    if (!status.nextPair) {
      return {
        created: false,
        reason: 'Not enough active server-side LLM players for matchmaking.',
        status,
      }
    }

    let gameId: string
    try {
      gameId = await this.gameService.createGame(
        status.nextPair.white.id,
        status.nextPair.black.id,
        {
          variant,
        },
      )
    } catch (e) {
      return {
        created: false,
        reason: (e as Error).message,
        status,
      }
    }

    return { created: true, gameId, pair: status.nextPair }
  }

  async getNextPair(
    variant: MatchmakingVariant = this.getVariant(),
  ): Promise<MatchmakingPair | null> {
    const eligiblePlayers = await this.getEligiblePlayers()
    if (eligiblePlayers.length < 2) return null

    const history = await this.db
      .select({
        whitePlayerId: games.whitePlayerId,
        blackPlayerId: games.blackPlayerId,
        createdAt: games.createdAt,
      })
      .from(games)
      .where(sql`${games.status} IN ('completed', 'draw')`)
      .orderBy(desc(games.createdAt))

    const stats = new Map<string, PairStats>()
    for (const game of history) {
      const key = this.getPairKey(game.whitePlayerId, game.blackPlayerId)
      const current =
        stats.get(key) ||
        ({
          gamesPlayed: 0,
          lastPlayedAt: null,
          whiteCounts: {},
        } satisfies PairStats)

      current.gamesPlayed += 1
      current.lastPlayedAt = current.lastPlayedAt || game.createdAt
      current.whiteCounts[game.whitePlayerId] = (current.whiteCounts[game.whitePlayerId] || 0) + 1
      stats.set(key, current)
    }

    const candidates: Array<{ pair: MatchmakingPair; score: number }> = []
    for (let i = 0; i < eligiblePlayers.length; i++) {
      for (let j = i + 1; j < eligiblePlayers.length; j++) {
        const first = eligiblePlayers[i]
        const second = eligiblePlayers[j]
        const pairStats = stats.get(this.getPairKey(first.id, second.id))
        const ratingGap = Math.abs(
          this.ratingForVariant(first, variant) - this.ratingForVariant(second, variant),
        )
        const gamesPlayed = pairStats?.gamesPlayed || 0
        const staleDays = pairStats?.lastPlayedAt
          ? Math.floor((Date.now() - pairStats.lastPlayedAt.getTime()) / 86400000)
          : 365

        const [white, black] = this.chooseColors(first, second, pairStats)
        const score = gamesPlayed * 100000 + ratingGap - staleDays * 10
        candidates.push({
          score,
          pair: {
            white,
            black,
            variant,
            gamesPlayed,
            ratingGap,
            reason:
              gamesPlayed === 0
                ? 'Unplayed pairing with closest available rating gap.'
                : 'Lowest-repeat pairing with rating proximity and color balance.',
          },
        })
      }
    }

    candidates.sort((a, b) => a.score - b.score || a.pair.ratingGap - b.pair.ratingGap)
    return candidates[0]?.pair || null
  }

  private async getEligiblePlayers(): Promise<MatchmakingPlayer[]> {
    const activeConfigs = await this.db
      .select({
        playerId: llmConfigurations.playerId,
        modelId: llmConfigurations.modelId,
        provider: llmConfigurations.provider,
      })
      .from(llmConfigurations)
      .where(eq(llmConfigurations.isActive, true))

    const activePlayerIds = activeConfigs
      .map((config) => config.playerId)
      .filter((playerId): playerId is string => Boolean(playerId))

    if (activePlayerIds.length < 2) return []

    const activePlayers = await this.db
      .select({
        id: players.id,
        name: players.name,
        provider: players.provider,
        version: players.version,
        rating: players.rating,
        rating960: players.rating960,
      })
      .from(players)
      .where(and(eq(players.type, 'llm'), inArray(players.id, activePlayerIds)))

    const configByPlayerId = new Map(activeConfigs.map((config) => [config.playerId, config]))
    return activePlayers
      .map((player) => {
        const config = configByPlayerId.get(player.id)
        return {
          id: player.id,
          name: player.name,
          provider: player.provider || config?.provider || null,
          modelId: player.version || config?.modelId || null,
          rating: player.rating,
          rating960: player.rating960,
        }
      })
      .filter((player) => player.provider !== 'system')
      .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
  }

  private async countOngoingArenaGames() {
    const result = await this.db
      .select({ id: games.id })
      .from(games)
      .where(and(sql`${games.status} IN ('ongoing', 'paused')`, isNull(games.tournamentId)))
    return result.length
  }

  private chooseColors(
    first: MatchmakingPlayer,
    second: MatchmakingPlayer,
    stats?: PairStats,
  ): [MatchmakingPlayer, MatchmakingPlayer] {
    const firstWhiteCount = stats?.whiteCounts[first.id] || 0
    const secondWhiteCount = stats?.whiteCounts[second.id] || 0

    if (firstWhiteCount > secondWhiteCount) return [second, first]
    return [first, second]
  }

  private getPairKey(firstId: string, secondId: string) {
    return [firstId, secondId].sort().join(':')
  }

  private ratingForVariant(player: MatchmakingPlayer, variant: MatchmakingVariant) {
    return variant === 'chess960' ? player.rating960 : player.rating
  }
}
