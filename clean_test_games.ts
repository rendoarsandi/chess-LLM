import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './server/src/db/schema'
import { eq, or, inArray } from 'drizzle-orm'

const sqlite = new Database('./server/chess.sqlite')
const db = drizzle(sqlite, { schema })

const RANDOM_BOT_ID = '00000000-0000-0000-0000-000000000001'

async function clean() {
    console.log(`Finding games involving Random Bot (${RANDOM_BOT_ID})...`)
    
    // Find all games with the random bot
    const testGames = await db.select({ id: schema.games.id }).from(schema.games).where(
        or(
            eq(schema.games.whitePlayerId, RANDOM_BOT_ID),
            eq(schema.games.blackPlayerId, RANDOM_BOT_ID)
        )
    )

    const testGameIds = testGames.map(g => g.id)

    if (testGameIds.length === 0) {
        console.log("No test games found involving the Random Bot.")
        return
    }

    console.log(`Found ${testGameIds.length} test games. Purging related data...`)

    // Find related reviews to delete analyses first
    const reviews = await db.select({ id: schema.gameReviews.id }).from(schema.gameReviews).where(
        inArray(schema.gameReviews.gameId, testGameIds)
    )
    const reviewIds = reviews.map(r => r.id)

    if (reviewIds.length > 0) {
        console.log(`Deleting ${reviewIds.length} game reviews and their analyses...`)
        await db.delete(schema.moveAnalyses).where(inArray(schema.moveAnalyses.reviewId, reviewIds))
        await db.delete(schema.gameReviews).where(inArray(schema.gameReviews.id, reviewIds))
    }

    console.log("Deleting moves...")
    await db.delete(schema.moves).where(inArray(schema.moves.gameId, testGameIds))

    console.log("Deleting rating history entries...")
    await db.delete(schema.ratingHistory).where(inArray(schema.ratingHistory.gameId, testGameIds))

    console.log("Deleting games...")
    await db.delete(schema.games).where(inArray(schema.games.id, testGameIds))

    console.log(`Successfully deleted ${testGameIds.length} test games and all associated data.`)
}

clean().catch(console.error).finally(() => sqlite.close())
