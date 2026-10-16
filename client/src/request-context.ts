import type {} from '@tanstack/react-router'
import type { Platform } from '../../server/src/core/platform'

declare module '@tanstack/react-router' {
  interface Register {
    server: { requestContext: { platform?: Platform } }
  }
}
