import { db } from './src/db'
import { players, games } from './src/db/schema'
import { randomUUID } from 'crypto'

async function seed() {
  console.log('Seeding database...')
  
  const p1Id = randomUUID()
  const p2Id = randomUUID()
  
  await db.insert(players).values([
    { id: p1Id, name: 'DeepBlue-ish', type: 'llm' },
    { id: p2Id, name: 'Stockfish-y', type: 'llm' }
  ])
  
  const gameId = randomUUID()
  await db.insert(games).values({
    id: gameId,
    whitePlayerId: p1Id,
    blackPlayerId: p2Id,
    status: 'ongoing',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  })
  
  console.log(`Seeded 2 players and 1 game (ID: ${gameId})`)
  process.exit(0)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
