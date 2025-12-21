import { db } from './src/db'
import { TournamentService } from './src/game/tournament.service'
import { tournaments, tournamentParticipants, players } from './src/db/schema'
import { eq } from 'drizzle-orm'

async function verifyPhase1() {
  console.log('Verifying Phase 1: Database & Service...')
  
  const ts = new TournamentService(db)
  
  try {
    // 1. Create a mock tournament
    const t = await ts.createTournament({
      name: 'Manual Verification Tournament',
      startTime: new Date(),
      totalRounds: 3,
      timeControlSettings: 'No Time Control'
    })
    console.log('Successfully created tournament:', t.id)
    
    // 2. Fetch it back
    const fetched = await ts.getTournament(t.id)
    if (fetched && fetched.name === 'Manual Verification Tournament') {
      console.log('Successfully fetched tournament back from DB.')
    } else {
      throw new Error('Failed to fetch tournament or data mismatch.')
    }
    
    // Cleanup (optional, but good practice)
    await db.delete(tournaments).where(eq(tournaments.id, t.id))
    console.log('Cleanup successful.')
    console.log('Phase 1 Verification PASSED.')
  } catch (e) {
    console.error('Phase 1 Verification FAILED:', e)
    process.exit(1)
  }
}

verifyPhase1()
