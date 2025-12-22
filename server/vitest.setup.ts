import { beforeAll, vi } from 'vitest'
import { logger } from './src/game/logger'

beforeAll(() => {
  // Silence custom logger during tests except errors
  logger.setLevel('error')

  // Silence standard console methods to reduce noise
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'debug').mockImplementation(() => {})
})