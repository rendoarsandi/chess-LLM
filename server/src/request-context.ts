import type { Platform } from './core/platform'

// Vite owns the local database, runner, and WebSocket lifecycle.
declare global {
  var __gamebenchPlatform: Platform | undefined
}
