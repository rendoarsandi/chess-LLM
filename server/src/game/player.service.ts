import { players, ratingHistory, games } from '../db/schema'
import { eq, or, and, sql, desc, gte } from 'drizzle-orm'

export class PlayerService {
  constructor(private db: any) {}

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
