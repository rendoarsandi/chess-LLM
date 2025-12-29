import { Hono } from 'hono'
import { getDb } from '../db'
import { games, players, tournamentParticipants, tournaments } from '../db/schema'
import { desc, eq } from 'drizzle-orm'
import { TournamentService } from '../game/tournament.service'

export const tournamentRoutes = (tournamentService: TournamentService) => {
  const router = new Hono()

  router.get('/', async (c) => {
    const allTournaments = await getDb()
      .select()
      .from(tournaments)
      .orderBy(desc(tournaments.createdAt))
    return c.json(allTournaments)
  })

  router.get('/:id', async (c) => {
    const id = c.req.param('id')
    const tournament = await tournamentService.getTournament(id)
    if (!tournament) return c.json({ error: 'Tournament not found' }, 404)
    return c.json(tournament)
  })

  router.get('/:id/participants', async (c) => {
    const id = c.req.param('id')
    const results = await getDb()
      .select({
        id: players.id,
        name: players.name,
        type: players.type,
        rating: players.rating,
        wins: players.wins,
        losses: players.losses,
        draws: players.draws,
        peakRating: players.peakRating,
        score: tournamentParticipants.score,
        buchholz: tournamentParticipants.buchholz,
      })
      .from(tournamentParticipants)
      .innerJoin(players, eq(tournamentParticipants.playerId, players.id))
      .where(eq(tournamentParticipants.tournamentId, id))
      .orderBy(desc(tournamentParticipants.score), desc(tournamentParticipants.buchholz))

    return c.json(results)
  })

  router.get('/:id/games', async (c) => {
    const id = c.req.param('id')
    const results = await getDb()
      .select()
      .from(games)
      .where(eq(games.tournamentId, id))
      .orderBy(desc(games.roundNumber), desc(games.createdAt))
    return c.json(results)
  })

  return router
}
