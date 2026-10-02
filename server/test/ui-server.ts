import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import { createApi } from '../src/api'
import { LocalPlatform } from '../src/local-platform'
import { NodeDatabase } from '../src/storage/node-database'
import { attachLiveSockets } from '../src/local-websocket'
import type { ModelProvider } from '../src/core/provider'

// A separate test host: no credentials, network inference, or user database.
const models = ['alpha', 'beta'].map((id) => ({
  id: `fixture/${id}`,
  name: `Fixture ${id}`,
  contextLength: 32000,
  inputPrice: 0,
  outputPrice: 0,
  requestPrice: 0,
}))
const provider: ModelProvider = {
  async listModels() {
    return models
  },
  async complete(model, prompt, _config, progress) {
    const fen = prompt.match(/FEN: ([^\n]+)/)![1].split(' ')
    const ply = (Number(fen[5]) - 1) * 2 + (fen[1] === 'b' ? 1 : 0)
    const action = ['f3', 'e5', 'g4', 'Qh4#'][ply]
    progress?.('', 'Synthetic fixture reasoning: considering the current board.')
    await new Promise((resolve) => setTimeout(resolve, 1500))
    progress?.(
      '',
      'Synthetic fixture reasoning: considering the current board. Choosing a legal move.',
    )
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return {
      text: JSON.stringify({
        action,
        explanation: 'Synthetic fixture explanation for a legal move.',
      }),
      reasoning:
        'Synthetic fixture reasoning: considering the current board. Choosing a legal move.',
      inputTokens: 80,
      outputTokens: 20,
      costUsd: 0.001,
      costEstimated: false,
      provider: 'fixture',
      responseModel: model.id,
      generationId: `fixture-${crypto.randomUUID()}`,
    }
  },
}
const platform = new LocalPlatform(new NodeDatabase(':memory:'), provider, 'fixture-admin', true)
const api = createApi(() => platform)
const server = serve({ fetch: api.fetch, port: 3002, hostname: '127.0.0.1' })
attachLiveSockets(server as Server, platform)
platform.start()
