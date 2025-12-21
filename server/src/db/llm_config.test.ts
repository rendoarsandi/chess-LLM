import { describe, it, expect } from 'vitest'
import * as schema from './schema'

describe('LLM Configurations Schema', () => {
  it('should have llmConfigurations table defined', () => {
    expect(schema.llmConfigurations).toBeDefined()
  })

  it('should have the required columns in llmConfigurations', () => {
    const table = schema.llmConfigurations
    expect(table.id).toBeDefined()
    expect(table.provider).toBeDefined()
    expect(table.modelId).toBeDefined()
    expect(table.apiKey).toBeDefined()
    expect(table.isActive).toBeDefined()
    expect(table.isHardcoded).toBeDefined()
    expect(table.createdAt).toBeDefined()
    expect(table.updatedAt).toBeDefined()
  })
})
