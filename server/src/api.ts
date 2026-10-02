import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { secureHeaders } from 'hono/secure-headers'
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

export function createApi<Bindings extends object>(resolve: (env: Bindings) => Platform) {
  const app = new Hono<{ Bindings: Bindings; Variables: { platform: Platform } }>()
  app.use('*', secureHeaders())
  app.use(
    '*',
    bodyLimit({
      maxSize: 16384,
      onError: (c) => c.json({ error: 'Request body exceeds 16 KB.' }, 413),
    }),
  )
  app.use('*', async (c, next) => {
    c.set('platform', resolve(c.env))
    c.header('Cache-Control', 'no-store')
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      const platform = c.get('platform')
      if (!platform.adminToken)
        return c.json(
          { error: 'Set ADMIN_API_TOKEN on the server before starting or changing runs.' },
          503,
        )
      const token = c.req.header('x-admin-token') ?? ''
      if (token.length > 256 || !(await equalToken(token, platform.adminToken))) {
        return c.json(
          {
            error:
              'Admin token is missing or incorrect. Connect with your admin token and try again.',
          },
          401,
        )
      }
    }
    await next()
  })

  app.onError((error, c) => {
    if (error instanceof InputError) return c.json({ error: error.message }, 400)
    if (error instanceof RunConflict) return c.json({ error: error.message }, 409)
    if (error instanceof SyntaxError)
      return c.json({ error: 'Request body must be valid JSON.' }, 400)
    console.error('API error', error)
    return c.json(
      {
        error:
          'The service could not complete this request. Retry shortly or check the server logs.',
      },
      502,
    )
  })

  app.get('/api/health', (c) => c.json(c.get('platform').health))
  app.get('/api/games', (c) =>
    c.json(
      Object.values(games).map(({ id, name, protocolVersion, seatNames }) => ({
        id,
        name,
        protocolVersion,
        seatNames,
      })),
    ),
  )
  app.get('/api/models', async (c) => c.json(await c.get('platform').listModels()))
  app.get('/api/runs', async (c) => c.json(await c.get('platform').listRuns()))
  app.post('/api/runs', async (c) => {
    const platform = c.get('platform')
    if (!platform.health.providerConfigured)
      return c.json({ error: 'Set OPENROUTER_API_KEY on the server before starting a run.' }, 503)
    const input = validateRunInput(await c.req.json())
    const adapter = games[input.gameId]
    if (!adapter) throw new InputError('This game is not available. Choose chess.')
    const id = c.req.header('Idempotency-Key') ?? crypto.randomUUID()
    if (!uuid.test(id)) throw new InputError('Idempotency-Key must be a UUID.')
    const existing = await platform.getRun(id)
    if (existing) {
      if (JSON.stringify(validateRunInput(existing.config)) !== JSON.stringify(input)) {
        throw new RunConflict('This request ID belongs to another run.')
      }
      // Reuse captured prices and repair scheduling/indexing after an interrupted creation.
      return c.json(await platform.createRun(id, existing.config), 201)
    }
    const catalog = await platform.listModels()
    const models = input.modelIds.map((id) => {
      const model = catalog.find((model) => model.id === id)
      if (!model) throw new InputError(`Model ${id} is not currently available through OpenRouter.`)
      return model
    })
    const run = await platform.createRun(id, {
      ...input,
      models,
      protocolVersion: adapter.protocolVersion,
    })
    return c.json(run, 201)
  })

  app.use('/api/runs/:id/*', async (c, next) => {
    if (!uuid.test(c.req.param('id') ?? '')) return c.json({ error: 'Run not found.' }, 404)
    await next()
  })
  app.get('/api/runs/:id', async (c) => {
    if (!uuid.test(c.req.param('id'))) return c.json({ error: 'Run not found.' }, 404)
    const run = await c.get('platform').getRun(c.req.param('id'))
    return run ? c.json(run) : c.json({ error: 'Run not found.' }, 404)
  })
  app.get('/api/runs/:id/live', async (c) => {
    const platform = c.get('platform')
    if (!(await platform.getRun(c.req.param('id')))) return c.json({ error: 'Run not found.' }, 404)
    if (!platform.live)
      return c.json({ error: 'Use a WebSocket connection for live updates.' }, 426)
    return platform.live(c.req.param('id'), c.req.raw)
  })
  app.post('/api/runs/:id/:action', async (c) => {
    const action = c.req.param('action')
    if (action !== 'pause' && action !== 'resume' && action !== 'cancel')
      return c.json({ error: 'Unknown run action.' }, 404)
    const platform = c.get('platform')
    if (!(await platform.getRun(c.req.param('id')))) return c.json({ error: 'Run not found.' }, 404)
    return c.json(await platform.command(c.req.param('id'), action))
  })
  app.get('/api/runs/:id/matches/:matchId/attempts', async (c) => {
    const platform = c.get('platform')
    const run = await platform.getRun(c.req.param('id'))
    if (!run || !run.matches.some((match) => match.id === c.req.param('matchId')))
      return c.json({ error: 'Match not found.' }, 404)
    return c.json(await platform.attempts(run.id, c.req.param('matchId')))
  })
  app.get('/api/runs/:id/export', async (c) => {
    const platform = c.get('platform')
    const run = await platform.getRun(c.req.param('id'))
    if (!run) return c.json({ error: 'Run not found.' }, 404)
    return platform.exportRun(run.id)
  })
  app.notFound((c) => c.json({ error: 'Endpoint not found.' }, 404))
  return app
}
