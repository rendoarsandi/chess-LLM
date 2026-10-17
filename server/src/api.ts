import { InputError, validateRunInput } from '../../shared/validation'
import type { Platform } from './core/platform'
import { RunConflict } from './core/runner'
import { games } from './games/chess'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function equalToken(candidate: string, expected: string) {
  const encoder = new TextEncoder()
  const [a, b] = await Promise.all(
    [candidate, expected].map((text) => crypto.subtle.digest('SHA-256', encoder.encode(text))),
  )
  const bytesA = new Uint8Array(a),
    bytesB = new Uint8Array(b)
  let difference = 0
  for (let i = 0; i < bytesA.length; i++) difference |= bytesA[i] ^ bytesB[i]
  return difference === 0
}

export async function authorize(request: Request, platform: Platform) {
  if (request.method === 'GET' || request.method === 'HEAD') return
  if (!platform.adminToken)
    return Response.json(
      { error: 'Set ADMIN_API_TOKEN on the server before starting or changing runs.' },
      { status: 503 },
    )
  const token = request.headers.get('x-admin-token') ?? ''
  if (token.length > 256 || !(await equalToken(token, platform.adminToken)))
    return Response.json(
      {
        error: 'Admin token is missing or incorrect. Connect with your admin token and try again.',
      },
      { status: 401 },
    )
}

class RequestTooLarge extends Error {}
export async function readBody(request: Request) {
  if (Number(request.headers.get('content-length')) > 16384) throw new RequestTooLarge()
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 16384) {
        await reader.cancel()
        throw new RequestTooLarge()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

export function apiError(error: unknown) {
  if (error instanceof RequestTooLarge)
    return Response.json({ error: 'Request body exceeds 16 KB.' }, { status: 413 })
  if (error instanceof InputError) return Response.json({ error: error.message }, { status: 400 })
  if (
    error instanceof RunConflict ||
    (error instanceof Error && 'code' in error && error.code === 'RUN_CONFLICT')
  )
    return Response.json({ error: error.message }, { status: 409 })
  if (error instanceof SyntaxError)
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  console.error('API error', error)
  return Response.json(
    {
      error: 'The service could not complete this request. Retry shortly or check the server logs.',
    },
    { status: 502 },
  )
}

export function secureResponse(response: Response) {
  if (response.status === 101) return response
  response = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  return response
}

export async function createRun(request: Request, platform: Platform, body: string) {
  if (!platform.health.providerConfigured)
    return Response.json(
      { error: 'Set OPENROUTER_API_KEY on the server before starting a run.' },
      { status: 503 },
    )
  const input = validateRunInput(JSON.parse(body))
  const adapter = games[input.gameId]
  if (!adapter) throw new InputError('This game is not available. Choose chess.')
  const id = request.headers.get('Idempotency-Key') ?? crypto.randomUUID()
  if (!uuid.test(id)) throw new InputError('Idempotency-Key must be a UUID.')
  const existing = await platform.getRun(id)
  if (existing) {
    if (JSON.stringify(validateRunInput(existing.config)) !== JSON.stringify(input))
      throw new RunConflict('This request ID belongs to another run.')
    return Response.json(await platform.createRun(id, existing.config), { status: 201 })
  }
  const catalog = await platform.listModels()
  const models = input.modelIds.map((id) => {
    const model = catalog.find((model) => model.id === id)
    if (!model) throw new InputError(`Model ${id} is not currently available through OpenRouter.`)
    return model
  })
  return Response.json(
    await platform.createRun(id, { ...input, models, protocolVersion: adapter.protocolVersion }),
    { status: 201 },
  )
}

export async function findRun(platform: Platform, id: string) {
  if (!uuid.test(id)) return null
  return platform.getRun(id)
}
export const notFound = () => Response.json({ error: 'Run not found.' }, { status: 404 })
export const gameCatalogue = () =>
  Object.values(games).map(({ id, name, protocolVersion, seatNames }) => ({
    id,
    name,
    protocolVersion,
    seatNames,
  }))

export function parseArenaQuery(
  params: URLSearchParams,
): import('../../shared/arena').HistoryQuery {
  const query: import('../../shared/arena').HistoryQuery = {}
  for (const key of ['gameId', 'protocol', 'modelA', 'modelB', 'search'] as const) {
    const value = params.get(key)?.trim()
    if (value && value.length > 200) throw new InputError(`${key} is too long.`)
    if (value) query[key] = value
  }
  const page = params.get('page')
  if (page !== null) {
    if (!/^\d+$/.test(page) || Number(page) < 1 || Number(page) > 1000000)
      throw new InputError('Page must be a positive integer up to 1000000.')
    query.page = Number(page)
  }
  const status = params.get('status')
  if (status !== null) {
    if (!['all', 'completed', 'running', 'queued', 'cancelled'].includes(status))
      throw new InputError('Unknown match status.')
    query.status = status as import('../../shared/arena').HistoryQuery['status']
  }
  if (query.modelA && query.modelA === query.modelB)
    throw new InputError('Choose two different models.')
  return query
}
