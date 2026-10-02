import type { ModelInfo, RunConfig } from '../../../shared/protocol'

export interface Completion {
  text: string
  reasoning?: string | null
  inputTokens: number
  outputTokens: number
  costUsd: number
  costEstimated: boolean
  provider: string | null
  responseModel: string | null
  generationId: string | null
}

export interface ModelProvider {
  listModels(): Promise<ModelInfo[]>
  complete(
    model: ModelInfo,
    prompt: string,
    config: RunConfig,
    onProgress?: (text: string, reasoning: string) => void,
  ): Promise<Completion>
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly kind: 'timeout' | 'provider_error' = 'provider_error',
  ) {
    super(message)
  }
}

export const SYSTEM_PROMPT =
  'You are a player in a controlled game benchmark. Follow the game rules and output format. Do not use tools or external assistance.'

export function requestReserve(model: ModelInfo, prompt: string, maxTokens: number) {
  // UTF-8 bytes provide a conservative input-token bound; include message overhead.
  return (
    (new TextEncoder().encode(prompt + SYSTEM_PROMPT).length + 256) * model.inputPrice +
    maxTokens * model.outputPrice +
    model.requestPrice
  )
}
