import { beforeAll, afterAll, vi } from 'vitest'
import { logger } from './src/game/logger'

beforeAll(async () => {
  // Silence custom logger during tests except errors
  logger.setLevel('error')

  // Silence standard console methods to reduce noise
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'debug').mockImplementation(() => {})

  // Note: We are NOT silencing console.error globally anymore.
  // This ensures you can still see the root cause of real failures.
})

afterAll(() => {
  vi.restoreAllMocks()
})
