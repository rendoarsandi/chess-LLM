import { tournaments, games, tournamentParticipants } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { generatePairings } from './swiss'
import { logger } from './logger'
import { AlarmService } from './alarm.service'
import { TournamentService } from './tournament.service'
import { GameService } from './game.service'

export class TournamentLoopService {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private db: any, 
    private tournamentService: TournamentService, 
    private gameService: GameService,
    private alarmService: AlarmService = new AlarmService()
  ) {}

  async advanceTournament(tournamentId: string) {
    const tResults = await this.db.select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId));
    
    if (tResults.length === 0) return;
    const t = tResults[0];

    if (t.status === 'completed') return;

    if (t.status === 'scheduled') {
      const now = new Date();
      if (t.startTime <= now) {
        await this.startTournament(t);
      } else {
        // Re-check closer to start time
        const delay = Math.min(t.startTime.getTime() - now.getTime(), 30000);
        this.alarmService.setAlarm(`tournament:${t.id}`, Math.max(delay, 5000), () => this.advanceTournament(t.id));
      }
      return;
    }

    if (t.status === 'active') {
      // Check if all games for the current round are completed
      const roundGames = await this.db.select()
        .from(games)
        .where(and(
          eq(games.tournamentId, t.id),
          eq(games.roundNumber, t.currentRound)
        ))

      const allFinished = roundGames.length > 0 && roundGames.every((g: { status: string }) => g.status === 'completed' || g.status === 'draw')
      
      if (allFinished) {
        if (t.currentRound < t.totalRounds) {
          await this.pairNextRound(t);
          this.alarmService.setAlarm(`tournament:${t.id}`, 10000, () => this.advanceTournament(t.id));
        } else {
          logger.info(`[TournamentLoop] Tournament ${t.id} completed.`)
          await this.db.update(tournaments)
            .set({ status: 'completed' })
            .where(eq(tournaments.id, t.id))
        }
      } else {
        // Check again later
        this.alarmService.setAlarm(`tournament:${t.id}`, 15000, () => this.advanceTournament(t.id));
      }
    }
  }

  private async startTournament(t: typeof tournaments.$inferSelect) {
    logger.info(`[TournamentLoop] Starting tournament: ${t.name} (${t.id})`)
    
    const participants = await this.tournamentService.getParticipants(t.id)
    if (participants.length < 2) {
      logger.warn(`[TournamentLoop] Not enough participants for tournament ${t.id}. Marking as completed.`)
      await this.db.update(tournaments).set({ status: 'completed' }).where(eq(tournaments.id, t.id));
      return
    }

    const playersForSwiss = participants.map((p: { playerId: string, score: number }) => ({ id: p.playerId, score: p.score }))
    const pairings = generatePairings(playersForSwiss, [])

    await this.db.update(tournaments)
      .set({ status: 'active', currentRound: 1 })
      .where(eq(tournaments.id, t.id))

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
    this.alarmService.setAlarm(`tournament:${t.id}`, 10000, () => this.advanceTournament(t.id));
  }

  private async pairNextRound(t: typeof tournaments.$inferSelect) {
    logger.info(`[TournamentLoop] Advancing tournament ${t.id} to Round ${t.currentRound + 1}`)
    const participants = await this.tournamentService.getParticipants(t.id)
    const playersForSwiss = participants.map((p: { playerId: string, score: number }) => ({ id: p.playerId, score: p.score }))
    const historyGames = await this.db.select().from(games).where(eq(games.tournamentId, t.id))
    const history = historyGames.map((g: { whitePlayerId: string, blackPlayerId: string }) => ({ white: g.whitePlayerId, black: g.blackPlayerId }))
    const pairings = generatePairings(playersForSwiss, history)

    await this.db.update(tournaments).set({ currentRound: t.currentRound + 1 }).where(eq(tournaments.id, t.id))

    for (const pair of pairings) {
      if (pair.black === 'BYE') {
        await this.db.update(tournamentParticipants).set({ score: sql`${tournamentParticipants.score} + 10` }).where(and(eq(tournamentParticipants.tournamentId, t.id), eq(tournamentParticipants.playerId, pair.white)))
        continue
      }
      await this.gameService.createGame(pair.white, pair.black, { tournamentId: t.id, roundNumber: t.currentRound + 1 })
    }
  }

  async runIteration() {
    const activeOrScheduled = await this.db.select({ id: tournaments.id })
      .from(tournaments)
      .where(sql`${tournaments.status} IN ('active', 'scheduled')`)

    for (const t of activeOrScheduled) {
      if (!this.alarmService.hasAlarm(`tournament:${t.id}`)) {
        await this.advanceTournament(t.id);
      }
    }
  }

  private isRunning: boolean = false;

  start(intervalMs: number = 10000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`[TournamentLoop] Starting tournament monitor with interval ${intervalMs}ms`)
    
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

