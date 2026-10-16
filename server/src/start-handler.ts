import type { Platform } from './core/platform'

export interface StartHandler {
  fetch(
    request: Request,
    options: { context: { platform: Platform } },
  ): Response | Promise<Response>
}

export async function loadStartHandler(): Promise<StartHandler> {
  const entry = new URL('../../client/dist/server/server.js', import.meta.url).href
  return (await import(entry)).default as StartHandler
}
