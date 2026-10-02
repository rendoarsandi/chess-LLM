import type { DurableObjectState } from '@cloudflare/workers-types'
import { Registry } from '../storage/registry'
import type { RunSummary } from '../../../shared/protocol'
import { durableDatabase } from './database'

export class ArenaRegistry {
  private registry: Registry
  constructor(state: DurableObjectState) {
    this.registry = new Registry(durableDatabase(state.storage))
  }

  async fetch(request: Request) {
    if (request.method === 'POST') {
      this.registry.upsert((await request.json()) as RunSummary)
      return Response.json({ saved: true })
    }
    return Response.json(this.registry.list())
  }
}
