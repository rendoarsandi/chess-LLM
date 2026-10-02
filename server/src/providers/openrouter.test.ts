import { afterEach, expect, it, vi } from 'vitest'
import { OpenRouterProvider } from './openrouter'
import type { RunConfig } from '../../../shared/protocol'

afterEach(() => vi.unstubAllGlobals())
const model = {
  id: 'fixture/model',
  name: 'Fixture model',
  contextLength: 32000,
  inputPrice: 0.000001,
  outputPrice: 0.000002,
  requestPrice: 0,
}
const config: RunConfig = {
  name: 'Fixture',
  gameId: 'chess',
  protocolVersion: 'chess-san-v1',
  models: [model],
  modelIds: [model.id],
  temperature: 0.1,
  maxTokens: 1024,
  maxPlies: 160,
  maxAttempts: 2,
  timeoutMs: 5000,
  repetitions: 1,
  budgetUsd: 1,
}
function chunk(delta: object, finish: string | null = null, usage?: object) {
  return {
    id: 'fixture-generation',
    model: model.id,
    created: 1,
    object: 'chat.completion.chunk',
    choices: [{ index: 0, delta, finish_reason: finish }],
    ...(usage ? { usage } : {}),
  }
}

it('decodes real SDK streaming frames, emits reasoning before completion, and retains reported billing', async () => {
  const chunks = [
    chunk({ reasoning: 'Consider the center. ' }),
    chunk({ content: '{"action":"e4",' }),
    chunk({ content: '"explanation":"Control the center."}' }, 'stop', {
      prompt_tokens: 31,
      completion_tokens: 12,
      total_tokens: 43,
      cost: 0.007,
    }),
  ]
  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(
        chunks.map((value) => `data: ${JSON.stringify(value)}\n\n`).join('') + 'data: [DONE]\n\n',
        { headers: { 'Content-Type': 'text/event-stream' } },
      ),
  )
  const progress: string[] = []
  const result = await new OpenRouterProvider({ OPENROUTER_API_KEY: 'fixture-key' }).complete(
    model,
    'Fixture prompt',
    config,
    (_text, reasoning) => progress.push(reasoning),
  )
  expect(progress[0]).toBe('Consider the center. ')
  expect(result).toMatchObject({
    text: '{"action":"e4","explanation":"Control the center."}',
    reasoning: 'Consider the center. ',
    inputTokens: 31,
    outputTokens: 12,
    costUsd: 0.007,
    costEstimated: false,
    generationId: 'fixture-generation',
  })
})

it('rejects a truncated stream instead of treating its partial JSON as a model failure', async () => {
  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(`data: ${JSON.stringify(chunk({ content: '{"action":' }))}\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
  )
  await expect(
    new OpenRouterProvider({ OPENROUTER_API_KEY: 'fixture-key' }).complete(
      model,
      'Fixture prompt',
      config,
    ),
  ).rejects.toMatchObject({ kind: 'provider_error' })
})
