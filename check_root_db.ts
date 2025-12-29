import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.resolve('chess.test.sqlite')
const db = new Database(dbPath)

console.log('Checking players table schema in ROOT chess.test.sqlite:')
const info = db.prepare('PRAGMA table_info(players)').all()
console.log(JSON.stringify(info, null, 2))

const migrations = db.prepare('SELECT * FROM __drizzle_migrations').all()
console.log('Migrations table:')
console.log(JSON.stringify(migrations, null, 2))

db.close()
