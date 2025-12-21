import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './server/src/db/schema'

const sqlite = new Database('./server/chess.sqlite')
const db = drizzle(sqlite)

async function purge() {
    console.log("Purging players and llm_configurations...")
    // BetterAuth tables are separate and shouldn't be affected by this
    await db.delete(schema.llmConfigurations)
    await db.delete(schema.players)
    console.log("Done. Restart your server to re-initialize clean data.")
}

purge().catch(console.error)
