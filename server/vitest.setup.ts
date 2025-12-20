import { vi, beforeAll } from 'vitest'
import { logger } from './src/game/logger'

beforeAll(() => {
  // Silence logs during tests except errors
  logger.setLevel('error')
})
