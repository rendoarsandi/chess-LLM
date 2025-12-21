import { tournaments, tournamentParticipants } from '../db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export class TournamentService {
  constructor(private db: any) {}

  async createTournament(data: { name: string, startTime: Date, totalRounds: number, timeControlSettings?: string }) {
    const id = randomUUID()
    await this.db.insert(tournaments).values({
      id,
      name: data.name,
      startTime: data.startTime,
      totalRounds: data.totalRounds,
      timeControlSettings: data.timeControlSettings,
      status: 'scheduled',
      currentRound: 0,
    })
    return { id }
  }

  async registerParticipant(tournamentId: string, playerId: string) {
    await this.db.insert(tournamentParticipants).values({
      tournamentId,
      playerId,
      score: 0,
      buchholz: 0,
    })
  }

  async startTournament(tournamentId: string) {
    await this.db.update(tournaments)
      .set({ status: 'active', currentRound: 1 })
      .where(eq(tournaments.id, tournamentId))
  }

  async getTournament(tournamentId: string) {
    const result = await this.db.select().from(tournaments).where(eq(tournaments.id, tournamentId))
    return result[0]
  }

  async getParticipants(tournamentId: string) {
    return await this.db.select().from(tournamentParticipants).where(eq(tournamentParticipants.tournamentId, tournamentId))
  }
}