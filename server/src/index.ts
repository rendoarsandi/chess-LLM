import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { db } from './db'
import { GameManager } from './game/game-manager'
import { GameService } from './game/game.service'
import { RandomPlayer } from './game/random-player'
import { GameLoopService } from './game/game-loop.service'

const app = new Hono()

// Initialize services
const gameManager = new GameManager()
const gameService = new GameService(db, gameManager)
const randomPlayer = new RandomPlayer()
const gameLoopService = new GameLoopService(db, gameService, randomPlayer)

// Start background loop
gameLoopService.start(5000)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const port = 3001
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
