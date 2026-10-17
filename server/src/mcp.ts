import type { McpReply } from '../../shared/mcp'
import { InputError } from '../../shared/validation'
import type { Platform } from './core/platform'
import { McpUnauthorized, validateMcpOperation } from './core/mcp-match'
import { RunConflict } from './core/runner'

// Stateless Streamable HTTP, using the 2025 MCP protocol family. A new connection
// never means a new game: credentials, positions, joins, and receipts are durable.
const versions = ['2025-03-26', '2025-06-18', '2025-11-25']
const matchId = { type: 'string', description: 'Match ID from list_matches.' }
const definitions = [
  {
    name: 'list_matches',
    description:
      'Discover scheduled matches for your credential-bound model. No model identity can be selected by the caller.',
    properties: {},
    required: [],
  },
  {
    name: 'join_match',
    description:
      'Join your scheduled seat. Both seats joining starts this match immediately; White moves first.',
    properties: { matchId },
    required: ['matchId'],
  },
  {
    name: 'get_match_state',
    description:
      'Recover after compaction or reconnect. Returns authoritative full PGN, exact FEN, legal SAN moves, and whose turn it is. Always trust this over chat memory.',
    properties: { matchId },
    required: ['matchId'],
  },
  {
    name: 'wait_for_turn',
    description:
      'Wait up to 25 seconds for your turn or a finished/paused match. Returns exact FEN and full PGN. Call again after a timeout while waiting; after your move, wait again. Does not start an idle AI host.',
    properties: {
      matchId,
      timeoutMs: { type: 'integer', minimum: 0, maximum: 25000, default: 25000 },
    },
    required: ['matchId'],
  },
  {
    name: 'submit_move',
    description:
      'Submit one legal SAN move using the exact FEN and ply from the current state. Use a unique moveId; retry with identical arguments if the response is lost. Optional explanation is a brief public summary; hidden reasoning is unavailable.',
    properties: {
      matchId,
      moveId: { type: 'string', pattern: '^[a-zA-Z0-9_-]{8,80}$' },
      expectedPly: { type: 'integer', minimum: 0 },
      expectedFen: { type: 'string', maxLength: 200 },
      action: {
        type: 'string',
        maxLength: 20,
        description: 'Exactly one move from legalActions, in SAN.',
      },
      explanation: { type: 'string', maxLength: 4000 },
    },
    required: ['matchId', 'moveId', 'expectedPly', 'expectedFen', 'action'],
  },
]
const tools = definitions.map(({ properties, required, ...definition }) => ({
  ...definition,
  inputSchema: { type: 'object', properties, required, additionalProperties: false },
  annotations: {
    readOnlyHint: !['join_match', 'submit_move'].includes(definition.name),
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
}))

function rpcError(id: unknown, code: number, message: string, status = 200) {
  return Response.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { status })
}

function toolResult(reply: McpReply) {
  return { content: [{ type: 'text', text: JSON.stringify(reply) }], structuredContent: reply }
}

function isAccessError(error: unknown) {
  return (
    error instanceof McpUnauthorized ||
    (error instanceof Error && 'code' in error && error.code === 'MCP_UNAUTHORIZED')
  )
}

function toolError(error: unknown) {
  const known =
    error instanceof InputError ||
    error instanceof RunConflict ||
    isAccessError(error) ||
    (error instanceof Error && 'code' in error && error.code === 'RUN_CONFLICT')
  if (!known) console.error('MCP tool error', error)
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: known
          ? (error as Error).message
          : 'Service unavailable. Retry with the same moveId, or recover with get_match_state.',
      },
    ],
  }
}

export async function handleMcp(
  request: Request,
  platform: Platform,
  body: string,
): Promise<Response> {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin)
    return rpcError(null, -32000, 'Origin is not allowed.', 403)
  if (!['POST', 'GET', 'DELETE'].includes(request.method))
    return new Response(null, { status: 405, headers: { Allow: 'POST, GET, DELETE' } })
  const token = request.headers
    .get('authorization')
    ?.match(/^Bearer (gbmcp\.([0-9a-f-]{36})\.[0-9a-f-]{36}\.[0-9a-f-]{36})$/i)
  if (!token) return unauthorized()
  const runId = token[2]
  try {
    await platform.mcp(runId, token[1], { type: 'identity' })
  } catch (error) {
    if (isAccessError(error)) return unauthorized()
    return rpcError(null, -32603, 'MCP run is unavailable.', 503)
  }
  // No standalone SSE session stream or protocol sessions are needed.
  if (request.method !== 'POST')
    return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return rpcError(null, -32600, 'Content-Type must be application/json.', 415)
  const accept = request.headers.get('accept') ?? ''
  if (!accept.includes('application/json') || !accept.includes('text/event-stream'))
    return rpcError(
      null,
      -32600,
      'Accept must include application/json and text/event-stream.',
      406,
    )
  const protocol = request.headers.get('mcp-protocol-version')
  if (protocol && !versions.includes(protocol))
    return rpcError(null, -32600, 'Unsupported MCP protocol version.', 400)
  let message: Record<string, unknown>
  try {
    const parsed = JSON.parse(body)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return rpcError(null, -32600, 'Expected a single JSON-RPC request.', 400)
    message = parsed
  } catch {
    return rpcError(null, -32700, 'Invalid JSON.', 400)
  }
  const { id, method } = message
  if (
    message.jsonrpc !== '2.0' ||
    typeof method !== 'string' ||
    (id !== undefined && typeof id !== 'string' && typeof id !== 'number')
  )
    return rpcError(null, -32600, 'Invalid JSON-RPC request.', 400)
  if (id === undefined) {
    // Notifications are acknowledged without performing tool mutations.
    return new Response(null, { status: 202 })
  }
  const respond = (result: unknown) => Response.json({ jsonrpc: '2.0', id, result })
  const params = message.params as Record<string, unknown> | undefined
  if (params !== undefined && (!params || typeof params !== 'object' || Array.isArray(params)))
    return rpcError(id, -32602, 'Invalid params.')
  if (method === 'initialize')
    return respond({
      protocolVersion: versions.includes(String(params?.protocolVersion))
        ? params!.protocolVersion
        : versions[versions.length - 1],
      capabilities: { tools: {} },
      serverInfo: { name: 'gamebench-chess', version: '1.0.0' },
      instructions:
        'Your credential fixes your scheduled model identity. List and join matches, then repeatedly wait_for_turn and submit_move until finished. After compaction call list_matches or get_match_state: full PGN and FEN are stored on the server. Use exact expectedFen and expectedPly; submit SAN only. Never reconstruct the board from chat memory. Hidden reasoning is not captured; explanation is optional. Keep polling after wait timeouts. A host must keep the agent running.',
    })
  if (method === 'ping') return respond({})
  if (method === 'tools/list') return respond({ tools })
  if (method !== 'tools/call') return rpcError(id, -32601, 'Method not found.')
  const definition = definitions.find((tool) => tool.name === params?.name)
  if (!definition) return rpcError(id, -32602, 'Unknown tool.')
  try {
    const args = params?.arguments ?? {}
    if (!args || typeof args !== 'object' || Array.isArray(args))
      throw new InputError('Expected an arguments object.')
    const input = args as Record<string, unknown>
    if (Object.keys(input).some((key) => !Object.hasOwn(definition.properties, key)))
      throw new InputError(
        'Unexpected tool argument. Model identity comes only from the credential.',
      )
    if (definition.name === 'list_matches')
      return respond(toolResult(await platform.mcp(runId, token[1], { type: 'list' })))
    const operation = validateMcpOperation({
      ...input,
      type:
        definition.name === 'join_match'
          ? 'join'
          : definition.name === 'submit_move'
            ? 'move'
            : 'state',
    })
    if (definition.name !== 'wait_for_turn')
      return respond(toolResult(await platform.mcp(runId, token[1], operation)))
    const timeoutMs = input.timeoutMs ?? 25000
    if (
      typeof timeoutMs !== 'number' ||
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 0 ||
      timeoutMs > 25000
    )
      throw new InputError('timeoutMs must be between 0 and 25000.')
    const metadata = params?._meta as Record<string, unknown> | undefined
    const progressToken = metadata?.progressToken
    if (
      progressToken !== undefined &&
      typeof progressToken !== 'string' &&
      typeof progressToken !== 'number'
    )
      throw new InputError('Invalid progress token.')
    let cancelled = false
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (value: unknown) => {
          if (!cancelled)
            controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(value)}\n\n`))
        }
        const deadline = Date.now() + timeoutMs
        let previous = ''
        let progress = 0
        try {
          while (!cancelled && !request.signal.aborted) {
            const reply = await platform.mcp(runId, token[1], operation)
            if (cancelled || request.signal.aborted) break
            const state = reply.state!
            const current = JSON.stringify(state)
            if (current !== previous && progressToken !== undefined) {
              send({
                jsonrpc: '2.0',
                method: 'notifications/progress',
                params: {
                  progressToken,
                  progress: ++progress,
                  message: current,
                },
              })
            } else if (current !== previous)
              controller.enqueue(encoder.encode(': position updated\n\n'))
            previous = current
            if (
              state.yourTurn ||
              state.status === 'completed' ||
              state.status === 'cancelled' ||
              state.runStatus !== 'running' ||
              !state.joined[state.seat === 'white' ? 0 : 1] ||
              Date.now() >= deadline
            ) {
              send({ jsonrpc: '2.0', id, result: toolResult(reply) })
              break
            }
            // Also keeps proxies aware of an active response while both agents wait.
            controller.enqueue(encoder.encode(': waiting for turn\n\n'))
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(500, Math.max(0, deadline - Date.now()))),
            )
          }
        } catch (error) {
          send({ jsonrpc: '2.0', id, result: toolError(error) })
        } finally {
          if (!cancelled) controller.close()
        }
      },
      cancel() {
        cancelled = true
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    if (isAccessError(error)) return unauthorized()
    return respond(toolError(error))
  }
}

function unauthorized() {
  return new Response(
    JSON.stringify({
      error: 'Use the model-specific participant Bearer token issued by the run administrator.',
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="gamebench-mcp"',
      },
    },
  )
}
