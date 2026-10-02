import { afterEach, expect, it } from 'vitest'
import { createApi } from './api'
import { LocalPlatform } from './local-platform'
import { NodeDatabase } from './storage/node-database'
import type { ModelProvider } from './core/provider'
import type { RunSnapshot } from '../../shared/protocol'

const database = new NodeDatabase(':memory:')
const models = ['fixture/alpha', 'fixture/beta'].map((id) => ({
  id,
  name: id,
  contextLength: 32000,
  inputPrice: 0,
  outputPrice: 0,
  requestPrice: 0,
}))
const provider: ModelProvider = {
  async listModels() {
    return models
  },
  async complete() {
    return {
      text: '{"action":"e4"}',
      inputTokens: 10,
      outputTokens: 5,
      costUsd: 0,
      costEstimated: false,
      provider: null,
      responseModel: null,
      generationId: null,
    }
  },
}
const platform = new LocalPlatform(database, provider, 'fixture-secret', true)
const app = createApi(() => platform)
const input = {
  name: 'API fixture',
  gameId: 'chess',
  modelIds: models.map((model) => model.id),
  repetitions: 1,
  temperature: 0.1,
  maxTokens: 128,
  maxPlies: 2,
  maxAttempts: 1,
  timeoutMs: 5000,
  budgetUsd: 1,
}
const headers = { 'Content-Type': 'application/json', 'x-admin-token': 'fixture-secret' }
afterEach(() => platform.stop())

it('protects mutations, validates the public protocol, and makes creation retry-safe', async () => {
  const id = crypto.randomUUID()
  const request = () =>
    app.request('/api/runs', {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': id },
      body: JSON.stringify(input),
    })
  const denied = await app.request('/api/runs', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(denied.status).toBe(401)
  expect(await platform.listRuns()).toHaveLength(0)
  const invalid = await app.request('/api/runs', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...input, modelIds: [models[0].id, models[0].id] }),
  })
  expect(invalid.status).toBe(400)
  const created = await request()
  expect(created.status).toBe(201)
  models[0].inputPrice = 0.01
  expect((await request()).status).toBe(201)
  models[0].inputPrice = 0
  expect(
    (
      await app.request('/api/runs', {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': id },
        body: JSON.stringify({ ...input, name: 'Changed experiment' }),
      })
    ).status,
  ).toBe(409)
  expect(await platform.listRuns()).toHaveLength(1)
  await platform.tickRun(id)
  const spectator = await app.request(`/api/runs/${id}`)
  expect(spectator.status).toBe(200)
  expect(await spectator.json()).toMatchObject({ id, matches: [{ plies: 1 }, { plies: 0 }] })
  const exported = await app.request(`/api/runs/${id}/export`)
  const record = (await exported.json()) as { run: RunSnapshot; attempts: unknown[] }
  expect(exported.headers.get('Content-Disposition')).toContain(`${id}.json`)
  expect(record.run.config.modelIds).toEqual(input.modelIds)
  expect(record.attempts).toHaveLength(1)
  expect(JSON.stringify(record)).not.toContain('fixture-secret')
  expect((await app.request('/api/runs/not-a-uuid')).status).toBe(404)
  expect((await app.request(`/api/runs/${id}/pause`, { method: 'POST', headers })).status).toBe(200)
  expect((await app.request(`/api/runs/${id}/export`)).status).toBe(200)
  database.close()
})
