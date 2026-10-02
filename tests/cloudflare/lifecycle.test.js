import { env } from 'cloudflare:workers'
import { evictDurableObject, runDurableObjectAlarm } from 'cloudflare:test'
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

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
  expect(await runDurableObjectAlarm(stub)).toBe(true)
  expect((await (await stub.fetch('https://run/')).json()).matches[0].plies).toBe(1)
  await evictDurableObject(stub)
  expect(await runDurableObjectAlarm(stub)).toBe(true)
  expect((await (await stub.fetch('https://run/')).json()).matches[0].plies).toBe(2)

  const live = await stub.fetch('https://run/live', { headers: { Upgrade: 'websocket' } })
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
})
