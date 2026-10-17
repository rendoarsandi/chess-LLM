import { env } from 'cloudflare:workers'
import { evictDurableObject, runDurableObjectAlarm } from 'cloudflare:test'
import { afterEach, expect, it, vi } from 'vitest'
import worker from '../../server/dist/worker.js'
import { summarize } from '../../shared/protocol'

afterEach(() => vi.unstubAllGlobals())

it('keeps MCP joins, credentials, and move receipts across Durable Object eviction without inference alarms', async () => {
  const inference = vi.fn(async () => {
    throw new Error('MCP must not call an inference provider')
  })
  vi.stubGlobal('fetch', inference)
  const admin = { 'Content-Type': 'application/json', 'x-admin-token': 'fixture-admin' }
  const response = await worker.fetch(
    new Request('https://gamebench/api/runs', {
      method: 'POST',
      headers: admin,
      body: JSON.stringify({
        name: 'MCP eviction',
        gameId: 'chess',
        execution: 'mcp',
        modelIds: ['harness/a', 'harness/b'],
      }),
    }),
    env,
  )
  expect(response.status).toBe(201)
  const run = await response.json()
  const credentials = await (
    await worker.fetch(
      new Request(`https://gamebench/api/runs/${run.id}/mcp-credentials`, {
        method: 'POST',
        headers: admin,
      }),
      env,
    )
  ).json()
  const stub = env.BENCHMARK_RUN.getByName(run.id)
  expect(await runDurableObjectAlarm(stub)).toBe(false)
  async function call(token, name, args) {
    const response = await worker.fetch(
      new Request('https://gamebench/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name, arguments: args },
        }),
      }),
      env,
    )
    expect(response.status).toBe(200)
    const reply = await response.json()
    expect(reply.result.isError).toBeUndefined()
    return reply.result.structuredContent
  }
  const matchId = run.matches[0].id
  for (const { token } of credentials) await call(token, 'join_match', { matchId })
  await evictDurableObject(stub)
  const token = credentials[0].token
  const { state } = await call(token, 'get_match_state', { matchId })
  expect(state).toMatchObject({ yourTurn: true, joined: [true, true] })
  const submission = {
    matchId,
    moveId: 'eviction-0001',
    expectedPly: state.ply,
    expectedFen: state.fen,
    action: 'e4',
  }
  expect((await call(token, 'submit_move', submission)).receipt.replayed).toBe(false)
  await evictDurableObject(stub)
  const recovered = await call(token, 'submit_move', submission)
  expect(recovered.receipt.replayed).toBe(true)
  expect(recovered.state).toMatchObject({ ply: 1, turn: 'black', joined: [true, true] })
  expect(recovered.state.pgn).toContain('1. e4')
  expect(await runDurableObjectAlarm(stub)).toBe(false)
  expect(inference).not.toHaveBeenCalled()
  const exported = await (
    await worker.fetch(new Request(`https://gamebench/api/runs/${run.id}/export`), env)
  ).json()
  expect(exported.attempts).toHaveLength(1)
  expect(JSON.stringify(exported)).not.toContain(token)
  const indexed = await (
    await worker.fetch(new Request(`https://gamebench/api/history?protocol=chess-san-mcp-v1`), env)
  ).json()
  expect(indexed.matches.find((match) => match.id === matchId)).toMatchObject({
    plies: 1,
    status: 'running',
  })
})

it('executes on real DO alarms, restores SQLite state, hibernates spectators, and finishes without a browser', async () => {
  vi.stubGlobal('fetch', async (request) => {
    const body = await request.json()
    const fen = body.messages[1].content.match(/FEN: ([^\n]+)/)[1].split(' ')
    const ply = (Number(fen[5]) - 1) * 2 + (fen[1] === 'b' ? 1 : 0)
    const action = ['f3', 'e5', 'g4', 'Qh4#'][ply]
    const values = [
      { reasoning: 'Synthetic fixture reasoning.' },
      { content: JSON.stringify({ action, explanation: 'Synthetic fixture explanation.' }) },
    ].map((delta, index) => ({
      id: `fixture-${ply}`,
      model: body.model,
      created: 1,
      object: 'chat.completion.chunk',
      choices: [{ index: 0, delta, finish_reason: index === 1 ? 'stop' : null }],
      ...(index === 1
        ? { usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, cost: 0.001 } }
        : {}),
    }))
    return new Response(
      values.map((value) => `data: ${JSON.stringify(value)}\n\n`).join('') + 'data: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } },
    )
  })
  const id = crypto.randomUUID()
  const models = ['fixture/a', 'fixture/b'].map((id) => ({
    id,
    name: id,
    contextLength: 32000,
    inputPrice: 0,
    outputPrice: 0,
    requestPrice: 0,
  }))
  const config = {
    name: 'Synthetic CF fixture',
    gameId: 'chess',
    protocolVersion: 'chess-san-v1',
    models,
    modelIds: models.map((model) => model.id),
    repetitions: 1,
    temperature: 0.1,
    maxTokens: 1024,
    maxPlies: 160,
    maxAttempts: 2,
    timeoutMs: 5000,
    budgetUsd: 1,
  }
  const stub = env.BENCHMARK_RUN.getByName(id)
  const created = await stub.fetch('https://run/initialize', {
    method: 'POST',
    body: JSON.stringify({ id, config }),
  })
  expect(created.status).toBe(200)
  // A pre-upgrade registry only saved summaries. Reading history must backfill its run object.
  const registryStub = env.ARENA_REGISTRY.getByName('global')
  await registryStub.fetch('https://registry/runs', {
    method: 'POST',
    body: JSON.stringify(summarize(await created.json())),
  })
  const restored = await (
    await worker.fetch(new Request('https://gamebench/api/history'), env)
  ).json()
  expect(restored.matches.filter((match) => match.runId === id)).toHaveLength(2)
  expect(restored.coverage.indexing).toBe(false)
  await evictDurableObject(registryStub)
  expect(await runDurableObjectAlarm(stub)).toBe(true)
  expect((await (await stub.fetch('https://run/')).json()).matches[0].plies).toBe(1)
  await evictDurableObject(stub)
  expect(await runDurableObjectAlarm(stub)).toBe(true)
  expect((await (await stub.fetch('https://run/')).json()).matches[0].plies).toBe(2)

  const live = await worker.fetch(
    new Request(`https://gamebench/api/runs/${id}/live`, { headers: { Upgrade: 'websocket' } }),
    env,
  )
  expect(live.status).toBe(101)
  const socket = live.webSocket
  socket.accept()
  function frame(predicate) {
    return new Promise((resolve) => {
      const listener = (message) => {
        const value = JSON.parse(message.data)
        if (predicate(value)) {
          socket.removeEventListener('message', listener)
          resolve(value)
        }
      }
      socket.addEventListener('message', listener)
    })
  }
  await evictDurableObject(stub)
  const reasoning = frame((event) => event.type === 'thinking' && event.reasoning)
  const updated = frame((event) => event.type === 'snapshot' && event.run.matches[0].plies === 3)
  expect(await runDurableObjectAlarm(stub)).toBe(true)
  expect((await reasoning).reasoning).toBe('Synthetic fixture reasoning.')
  expect((await updated).run.matches[0].plies).toBe(3)
  const closed = new Promise((resolve) => socket.addEventListener('close', resolve, { once: true }))
  socket.close(1000, 'Fixture complete')
  await closed
  for (let i = 0; i < 5; i++) expect(await runDurableObjectAlarm(stub)).toBe(true)
  const run = await (await stub.fetch('https://run/')).json()
  expect(run.status).toBe('completed')
  expect(run.matches.map((match) => match.result.scores)).toEqual([
    [0, 1],
    [0, 1],
  ])
  expect(await runDurableObjectAlarm(stub)).toBe(false)
  const exportResponse = await stub.fetch('https://run/export')
  expect((await exportResponse.json()).attempts).toHaveLength(8)
  const registry = await (
    await env.ARENA_REGISTRY.getByName('global').fetch('https://registry/runs')
  ).json()
  expect(registry.find((run) => run.id === id)).toMatchObject({
    status: 'completed',
    completedMatches: 2,
  })
  await evictDurableObject(registryStub)
  const leaderboard = await (
    await worker.fetch(new Request('https://gamebench/api/leaderboard'), env)
  ).json()
  expect(leaderboard.rows.map((row) => [row.modelId, row.games, row.wins, row.losses])).toEqual([
    ['fixture/a', 2, 1, 1],
    ['fixture/b', 2, 1, 1],
  ])
  const history = await (
    await worker.fetch(
      new Request(
        'https://gamebench/api/history?modelA=fixture%2Fa&modelB=fixture%2Fb&status=completed',
      ),
      env,
    )
  ).json()
  expect(history.headToHead).toEqual({ games: 2, aWins: 1, draws: 0, bWins: 1 })
  expect(history.matches.map((match) => match.runId)).toEqual([id, id])
})
