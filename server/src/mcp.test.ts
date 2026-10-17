import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer, type RequestListener } from 'node:http'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { toNodeHandler } from 'srvx/node'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import type { McpCredential, McpMatchState, McpReply } from '../../shared/mcp'
import type { LiveEvent, RunSnapshot } from '../../shared/protocol'
import type { LeaderboardPage } from '../../shared/arena'
import { LocalPlatform } from './local-platform'
import { NodeDatabase } from './storage/node-database'
import { loadStartHandler, type StartHandler } from './start-handler'

let app: StartHandler
beforeAll(async () => {
  app = await loadStartHandler()
})
const cleanup: (() => void)[] = []
afterEach(() => {
  for (const close of cleanup.splice(0)) close()
})

interface Envelope {
  id?: number
  result?: {
    structuredContent?: McpReply
    isError?: boolean
    content?: { text: string }[]
    protocolVersion?: string
    tools?: { name: string }[]
  }
  error?: { code: number; message: string }
}

async function fixture(modelIds = ['lab/argon', 'lab/opus'], options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'gamebench-mcp-'))
  const filename = join(directory, 'run.sqlite')
  let database = new NodeDatabase(filename)
  const provider = {
    listModels: vi.fn(async () => {
      throw new Error('No catalogue in MCP mode')
    }),
    complete: vi.fn(async () => {
      throw new Error('No inference in MCP mode')
    }),
  }
  let platform = new LocalPlatform(database, provider, 'admin', false)
  cleanup.push(() => {
    platform.stop()
    database.close()
    rmSync(directory, { recursive: true, force: true })
  })
  const request = (path: string, init?: RequestInit) =>
    Promise.resolve(
      app.fetch(new Request(`http://localhost${path}`, init), { context: { platform } }),
    )
  const admin = { 'Content-Type': 'application/json', 'x-admin-token': 'admin' }
  const created = await request('/api/runs', {
    method: 'POST',
    headers: admin,
    body: JSON.stringify({
      name: 'External hosts',
      gameId: 'chess',
      execution: 'mcp',
      modelIds,
      ...options,
    }),
  })
  expect(created.status).toBe(201)
  const run = (await created.json()) as RunSnapshot
  const credentialsResponse = await request(`/api/runs/${run.id}/mcp-credentials`, {
    method: 'POST',
    headers: admin,
  })
  expect(credentialsResponse.status).toBe(200)
  const credentials = (await credentialsResponse.json()) as McpCredential[]
  const headers = (token: string) => ({
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${token}`,
  })
  const rpc = (token: string, message: unknown, extraHeaders = {}) =>
    request('/api/mcp', {
      method: 'POST',
      headers: { ...headers(token), ...extraHeaders },
      body: JSON.stringify(message),
    })
  const callResponse = (token: string, name: string, args = {}, meta = {}) =>
    rpc(token, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args, _meta: meta },
    })
  const call = async (token: string, name: string, args = {}): Promise<Envelope> =>
    (await callResponse(token, name, args)).json()
  const state = async (token: string, matchId: string) => {
    const reply = await call(token, 'get_match_state', { matchId })
    expect(reply.result?.isError).toBeUndefined()
    return reply.result!.structuredContent!.state!
  }
  const move = (
    token: string,
    state: McpMatchState,
    action: string,
    moveId: string = crypto.randomUUID(),
    explanation?: string,
  ) => {
    const args = {
      matchId: state.matchId,
      expectedPly: state.ply,
      expectedFen: state.fen,
      action,
      moveId,
      ...(explanation ? { explanation } : {}),
    }
    return { args, response: () => call(token, 'submit_move', args) }
  }
  return {
    run,
    credentials,
    provider,
    request,
    admin,
    headers,
    rpc,
    call,
    callResponse,
    state,
    move,
    platform: () => platform,
    restart: () => {
      platform.stop()
      database.close()
      database = new NodeDatabase(filename)
      platform = new LocalPlatform(database, provider, 'admin', false)
    },
  }
}

it('starts on the second join, streams the turn, and recovers a complete scored game after restart without inference', async () => {
  const f = await fixture()
  const [white, black] = f.credentials.map((credential) => credential.token)
  const [first, second] = f.run.matches
  const events: LiveEvent[] = []
  const unsubscribe = f.platform().subscribe(f.run.id, (event) => events.push(event))
  await f.call(white, 'join_match', { matchId: first.id })
  await f.platform().tickRun(f.run.id)
  expect((await f.state(white, first.id)).status).toBe('queued')
  const waiting = await f.callResponse(
    white,
    'wait_for_turn',
    { matchId: first.id, timeoutMs: 3000 },
    { progressToken: 'turn-1' },
  )
  expect(waiting.headers.get('content-type')).toContain('text/event-stream')
  const stream = waiting.text()
  await f.call(black, 'join_match', { matchId: first.id })
  const frames = (await stream)
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)))
  expect(
    frames.some(
      (frame) =>
        frame.method === 'notifications/progress' && JSON.parse(frame.params.message).yourTurn,
    ),
  ).toBe(true)
  expect(frames.at(-1).result.structuredContent.state).toMatchObject({
    yourTurn: true,
    turn: 'white',
    ply: 0,
  })
  const firstMove = f.move(
    white,
    await f.state(white, first.id),
    'f3',
    'opening-0001',
    'Open the f-pawn.',
  )
  const opponentWait = await f.callResponse(black, 'wait_for_turn', {
    matchId: first.id,
    timeoutMs: 3000,
  })
  const opponentStream = opponentWait.text()
  const simultaneous = await Promise.all([firstMove.response(), firstMove.response()])
  expect(
    simultaneous.map((reply) => reply.result!.structuredContent!.receipt!.replayed).sort(),
  ).toEqual([false, true])
  const handoff = (await opponentStream)
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)))
    .at(-1)
  expect(handoff.result.structuredContent.state).toMatchObject({
    yourTurn: true,
    turn: 'black',
    ply: 1,
  })
  await f.move(black, await f.state(black, first.id), 'e5').response()
  expect(
    events.some((event) => event.type === 'snapshot' && event.run.matches[0].plies === 2),
  ).toBe(true)
  unsubscribe()
  f.restart()
  const restored = await f.state(white, first.id)
  expect(restored).toMatchObject({
    ply: 2,
    yourTurn: true,
    joined: [true, true],
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2',
  })
  expect(restored.pgn).toContain('1. f3 e5')
  expect(restored.legalActions).toContain('g4')
  await f.move(white, restored, 'g4').response()
  const finalMove = f.move(black, await f.state(black, first.id), 'Qh4#')
  expect((await finalMove.response()).result!.structuredContent!.state!.result).toEqual({
    scores: [0, 1],
    reason: 'checkmate',
  })
  expect((await finalMove.response()).result!.structuredContent!.receipt!.replayed).toBe(true)
  for (const token of [black, white]) await f.call(token, 'join_match', { matchId: second.id })
  for (const [index, action] of ['f3', 'e5', 'g4', 'Qh4#'].entries()) {
    const token = index % 2 === 0 ? black : white
    await f.move(token, await f.state(token, second.id), action).response()
  }
  const exported = await (await f.request(`/api/runs/${f.run.id}/export`)).text()
  const record = JSON.parse(exported)
  expect(record.run.status).toBe('completed')
  expect(record.attempts).toHaveLength(8)
  expect(record.attempts[0]).toMatchObject({
    explanation: 'Open the f-pawn.',
    reasoning: null,
    responseModel: null,
    provider: 'mcp',
  })
  expect(
    record.run.matches
      .map((match: { state: string }) => match.state)
      .every((pgn: string) => pgn.includes('2. g4 Qh4#')),
  ).toBe(true)
  for (const { token } of f.credentials) expect(exported).not.toContain(token)
  expect(f.provider.complete).not.toHaveBeenCalled()
  expect(f.provider.listModels).not.toHaveBeenCalled()
  const leaders = (await (
    await f.request('/api/leaderboard?protocol=chess-san-mcp-v1')
  ).json()) as LeaderboardPage
  expect(leaders.rows.map((row: { games: number }) => row.games)).toEqual([2, 2])
})

it('binds access to scheduled models and rejects stale turns, impersonation, conflicting retries, and revoked credentials', async () => {
  const f = await fixture(['lab/argon', 'lab/opus', 'lab/third'])
  const [white, black, other] = f.credentials.map((credential) => credential.token)
  const matchId = f.run.matches[0].id
  expect((await f.call(other, 'join_match', { matchId })).result?.isError).toBe(true)
  const discovery = (await f.call(other, 'list_matches')).result!.structuredContent!
  expect(discovery.matches!.every((match) => match.modelIds.includes('lab/third'))).toBe(true)
  expect(discovery.matches!.some((match) => match.matchId === matchId)).toBe(false)
  expect(
    (await f.call(white, 'join_match', { matchId, modelId: 'lab/opus' })).result?.isError,
  ).toBe(true)
  const initial = await f.state(white, matchId)
  expect((await f.move(white, initial, 'e4').response()).result?.isError).toBe(true)
  await Promise.all([
    f.call(white, 'join_match', { matchId }),
    f.call(black, 'join_match', { matchId }),
  ])
  const wrongTurn = await f.move(black, initial, 'e4').response()
  expect(wrongTurn.result?.isError).toBe(true)
  expect(wrongTurn.result?.content?.[0].text).toContain('other model')
  const submission = f.move(white, initial, 'e4', 'identity-0001')
  await submission.response()
  expect(
    (await f.call(white, 'submit_move', { ...submission.args, action: 'd4' })).result?.isError,
  ).toBe(true)
  const blackState = await f.state(black, matchId)
  const stale = f.move(black, blackState, 'e5')
  expect(
    (await f.call(black, 'submit_move', { ...stale.args, expectedFen: initial.fen })).result
      ?.isError,
  ).toBe(true)
  expect(
    (await f.call(black, 'submit_move', { ...stale.args, expectedPly: 0 })).result?.isError,
  ).toBe(true)
  expect((await f.state(black, matchId)).ply).toBe(1)
  const rotated = (await (
    await f.request(`/api/runs/${f.run.id}/mcp-credentials`, { method: 'POST', headers: f.admin })
  ).json()) as McpCredential[]
  expect((await f.callResponse(white, 'list_matches')).status).toBe(401)
  expect((await f.state(rotated[1].token, matchId)).ply).toBe(1)
  expect(
    (
      await f.request(`/api/runs/${f.run.id}/mcp-credentials`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${rotated[0].token}` },
      })
    ).status,
  ).toBe(401)
})

it('connects a stdio harness through real HTTP and forwards streamed turn results as JSON-RPC', async () => {
  const f = await fixture()
  const server = createServer(
    toNodeHandler((request) =>
      app.fetch(request, { context: { platform: f.platform() } }),
    ) as RequestListener,
  )
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No test server address')
  const bridge = spawn(
    process.execPath,
    [fileURLToPath(new URL('../../scripts/mcp-stdio.mjs', import.meta.url))],
    {
      env: {
        ...process.env,
        GAMEBENCH_MCP_URL: `http://127.0.0.1:${address.port}/api/mcp`,
        GAMEBENCH_MCP_TOKEN: f.credentials[1].token,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )
  cleanup.push(() => {
    bridge.kill()
    server.closeAllConnections()
    server.close()
  })
  const pending = new Map<
    number,
    { resolve: (reply: Envelope) => void; reject: (error: Error) => void }
  >()
  const lines = createInterface({ input: bridge.stdout })
  let stderr = ''
  bridge.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })
  lines.on('line', (line) => {
    const reply = JSON.parse(line) as Envelope
    if (reply.id !== undefined) {
      pending.get(reply.id)?.resolve(reply)
      pending.delete(reply.id)
    }
  })
  bridge.on('exit', () => {
    for (const task of pending.values()) task.reject(new Error(`Bridge exited: ${stderr}`))
  })
  let id = 0
  const send = (method: string, params = {}) =>
    new Promise<Envelope>((resolve, reject) => {
      pending.set(++id, { resolve, reject })
      bridge.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    })
  expect(
    (
      await send('initialize', {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'stdio-host', version: '1' },
      })
    ).result?.protocolVersion,
  ).toBe('2025-11-25')
  const listed = await send('tools/call', { name: 'list_matches', arguments: {} })
  const matchId = f.run.matches[0].id
  expect(listed.result?.structuredContent?.modelId).toBe('lab/opus')
  await send('tools/call', { name: 'join_match', arguments: { matchId } })
  await f.call(f.credentials[0].token, 'join_match', { matchId })
  const waiting = send('tools/call', {
    name: 'wait_for_turn',
    arguments: { matchId, timeoutMs: 3000 },
    _meta: { progressToken: 'bridge-turn' },
  })
  await f
    .move(f.credentials[0].token, await f.state(f.credentials[0].token, matchId), 'e4')
    .response()
  const handoff = await waiting
  expect(handoff.result?.structuredContent?.state).toMatchObject({
    ply: 1,
    turn: 'black',
    yourTurn: true,
  })
  expect(handoff.result?.structuredContent?.state?.pgn).toContain('1. e4')
  expect(stderr).toBe('')
})

it('preserves operator controls and counts invalid submissions once through move limits and forfeits', async () => {
  const f = await fixture(undefined, { maxPlies: 2, maxAttempts: 1 })
  const [a, b] = f.credentials.map((credential) => credential.token)
  const [first, second] = f.run.matches
  for (const match of [first, second])
    for (const token of [a, b]) await f.call(token, 'join_match', { matchId: match.id })
  await f.request(`/api/runs/${f.run.id}/pause`, { method: 'POST', headers: f.admin })
  expect((await f.move(a, await f.state(a, first.id), 'e4').response()).result?.isError).toBe(true)
  const paused = await f.callResponse(b, 'wait_for_turn', { matchId: first.id, timeoutMs: 25000 })
  expect(await paused.text()).toContain('"runStatus":"paused"')
  await f.request(`/api/runs/${f.run.id}/resume`, { method: 'POST', headers: f.admin })
  await f.move(a, await f.state(a, first.id), 'e4').response()
  await f.move(b, await f.state(b, first.id), 'e5').response()
  expect((await f.state(a, first.id)).result?.reason).toBe('move_limit')
  const invalid = f.move(b, await f.state(b, second.id), 'e9', 'invalid-0001')
  const rejected = (await invalid.response()).result!.structuredContent!
  expect(rejected.receipt).toMatchObject({ accepted: false, replayed: false })
  expect(rejected.state?.result).toEqual({ scores: [0, 1], reason: 'invalid_action_forfeit' })
  expect((await invalid.response()).result!.structuredContent!.receipt!.replayed).toBe(true)
  const attempts = await f.platform().attempts(f.run.id)
  expect(attempts.filter((attempt) => attempt.outcome === 'invalid')).toHaveLength(1)
})

it('negotiates MCP and validates its HTTP and JSON-RPC boundaries', async () => {
  const f = await fixture()
  const token = f.credentials[0].token
  const initialized = await f.rpc(token, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'test-host', version: '1' },
    },
  })
  expect(((await initialized.json()) as Envelope).result!.protocolVersion).toBe('2025-11-25')
  const listed = await f.rpc(token, { jsonrpc: '2.0', id: 2, method: 'tools/list' })
  expect(((await listed.json()) as Envelope).result!.tools!.map((tool) => tool.name)).toContain(
    'wait_for_turn',
  )
  expect((await f.rpc(token, { jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(
    202,
  )
  expect(
    (
      await f.rpc(
        token,
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { Origin: 'https://attacker.example' },
      )
    ).status,
  ).toBe(403)
  expect((await f.rpc(token, {}, { 'MCP-Protocol-Version': '9999' })).status).toBe(400)
  expect((await f.rpc(token, {}, { Accept: 'application/json' })).status).toBe(406)
  expect(
    (await f.request('/api/mcp', { method: 'POST', headers: f.headers(token), body: '{' })).status,
  ).toBe(400)
  expect((await f.request('/api/mcp', { headers: f.headers(token) })).status).toBe(405)
  expect(
    (await f.request('/api/mcp', { method: 'POST', headers: f.admin, body: '{}' })).status,
  ).toBe(401)
  const unknown = await f.call(token, 'unknown_tool')
  expect(unknown.error?.code).toBe(-32602)
  expect(
    (await f.call(token, 'wait_for_turn', { matchId: f.run.matches[0].id, timeoutMs: 25001 }))
      .result?.isError,
  ).toBe(true)
  const waiting = await f.callResponse(token, 'wait_for_turn', {
    matchId: f.run.matches[0].id,
    timeoutMs: 0,
  })
  expect(await waiting.text()).toContain('"nextTool":"join_match"')
  expect((await f.state(token, f.run.matches[0].id)).joined).toEqual([false, false])
})
