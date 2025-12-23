import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './server/src/db/schema'

const sqlite = new Database('./server/chess.sqlite')
const db = drizzle(sqlite, { schema })

async function purge() {
    console.log("Purging all game data, moves, ratings and players...")
    // Order matters for foreign keys
    await db.delete(schema.moveAnalyses)
    await db.delete(schema.gameReviews)
    await db.delete(schema.moves)
    await db.delete(schema.ratingHistory)
    await db.delete(schema.games)
    await db.delete(schema.tournamentParticipants)
    await db.delete(schema.tournaments)
    await db.delete(schema.llmConfigurations)
    await db.delete(schema.players)
    console.log("Done. Restart your server to re-initialize clean data.")
}

purge().catch(console.error)
