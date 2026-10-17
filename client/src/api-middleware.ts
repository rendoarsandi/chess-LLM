import { createMiddleware } from '@tanstack/react-start'
import { apiError, authorize, readBody, secureResponse } from '../../server/src/api'
import '../../server/src/request-context'
import './request-context'
import { handleMcp } from '../../server/src/mcp'

export const apiMiddleware = createMiddleware().server(async ({ request, context, next }) => {
  try {
    const platform = context.platform ?? globalThis.__gamebenchPlatform
    if (!platform) throw new Error('Server platform is not configured.')
    const body = await readBody(request)
    if (new URL(request.url).pathname === '/api/mcp')
      return secureResponse(await handleMcp(request, platform, body))
    const denied = await authorize(request, platform)
    if (denied) return secureResponse(denied)
    const result = await next({ context: { apiPlatform: platform, body } })
    return { ...result, response: secureResponse(result.response) }
  } catch (error) {
    return secureResponse(apiError(error))
  }
})
