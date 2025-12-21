import { tournaments, tournamentParticipants, games, players } from '../db/schema'
import { eq, and, lte, sql, inArray, desc } from 'drizzle-orm'
import { generatePairings } from './swiss'
import { logger } from './logger'

export class TournamentLoopService {
  constructor(
    private db: any, 
    private tournamentService: any, 
    private gameService: any
  ) {}

  async runIteration() {
    await this.startDueTournaments()
    await this.advanceTournaments()
  }

  private async startDueTournaments() {
    const now = new Date()
    const dueTournaments = await this.db.select()
      .from(tournaments)
      .where(and(
        eq(tournaments.status, 'scheduled'),
        lte(tournaments.startTime, now)
      ))

    for (const t of dueTournaments) {
      logger.info(`[TournamentLoop] Starting tournament: ${t.name} (${t.id})`)
      
      const participants = await this.tournamentService.getParticipants(t.id)
      if (participants.length < 2) {
        logger.warn(`[TournamentLoop] Not enough participants for tournament ${t.id}. Skipping.`)
        continue
      }

      // Generate Round 1 pairings
      const playersForSwiss = participants.map((p: any) => ({ id: p.playerId, score: p.score }))
      const pairings = generatePairings(playersForSwiss, [])

      // Start the tournament (Update status)
      await this.db.update(tournaments)
        .set({ status: 'active', currentRound: 1 })
        .where(eq(tournaments.id, t.id))

      // Create games for pairings
      for (const pair of pairings) {
        if (pair.black === 'BYE') {
          await this.db.update(tournamentParticipants)
            .set({ score: sql`${tournamentParticipants.score} + 10` })
            .where(and(
              eq(tournamentParticipants.tournamentId, t.id),
              eq(tournamentParticipants.playerId, pair.white)
            ))
          continue
        }

        await this.gameService.createGame(pair.white, pair.black, {
          tournamentId: t.id,
          roundNumber: 1
        })
      }
      
      logger.info(`[TournamentLoop] Tournament ${t.id} started with ${pairings.length} pairings for Round 1.`)
    }
  }

  private async advanceTournaments() {
    const activeTournaments = await this.db.select()
      .from(tournaments)
      .where(eq(tournaments.status, 'active'))

    for (const t of activeTournaments) {
      // Check if all games for the current round are completed
      const roundGames = await this.db.select()
        .from(games)
        .where(and(
          eq(games.tournamentId, t.id),
          eq(games.roundNumber, t.currentRound)
        ))

      const allFinished = roundGames.every((g: any) => g.status === 'completed' || g.status === 'draw')
      
      if (roundGames.length > 0 && allFinished) {
        if (t.currentRound < t.totalRounds) {
          logger.info(`[TournamentLoop] Advancing tournament ${t.id} to Round ${t.currentRound + 1}`)
          
          // Generate next round pairings
          const participants = await this.tournamentService.getParticipants(t.id)
          const playersForSwiss = participants.map((p: any) => ({ id: p.playerId, score: p.score }))
          
          // Fetch history of all games in this tournament so far
          const historyGames = await this.db.select()
            .from(games)
            .where(eq(games.tournamentId, t.id))
          
          const history = historyGames.map((g: any) => ({ white: g.whitePlayerId, black: g.blackPlayerId }))
          
          const pairings = generatePairings(playersForSwiss, history)

          // Update tournament round
          await this.db.update(tournaments)
            .set({ currentRound: t.currentRound + 1 })
            .where(eq(tournaments.id, t.id))

          // Create games for pairings
          for (const pair of pairings) {
            if (pair.black === 'BYE') {
              await this.db.update(tournamentParticipants)
                .set({ score: sql`${tournamentParticipants.score} + 10` })
                .where(and(
                  eq(tournamentParticipants.tournamentId, t.id),
                  eq(tournamentParticipants.playerId, pair.white)
                ))
              continue
            }

            await this.gameService.createGame(pair.white, pair.black, {
              tournamentId: t.id,
              roundNumber: t.currentRound + 1
            })
          }
        } else {
          logger.info(`[TournamentLoop] Tournament ${t.id} completed.`)
          await this.db.update(tournaments)
            .set({ status: 'completed' })
            .where(eq(tournaments.id, t.id))
        }
      }
    }
  }

  private isRunning: boolean = false;

  start(intervalMs: number = 10000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`[TournamentLoop] Starting tournament loop with interval ${intervalMs}ms`)
    
    const loop = async () => {
      if (!this.isRunning) return;
      try {
        await this.runIteration()
      } catch (e) {
        logger.error('[TournamentLoop] Error in iteration:', e)
      } finally {
        setTimeout(loop, intervalMs)
      }
    }
    
    loop()
  }

  stop() {
    this.isRunning = false;
  }
}
