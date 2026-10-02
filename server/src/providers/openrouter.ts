import { OpenRouter } from '@openrouter/sdk'
import type { ModelInfo, RunConfig } from '../../../shared/protocol'
import { ProviderError, SYSTEM_PROMPT, requestReserve, type ModelProvider } from '../core/provider'

export interface ProviderSettings {
  OPENROUTER_API_KEY?: string
  OPENROUTER_HTTP_REFERER?: string
  OPENROUTER_APP_TITLE?: string
}

let catalog: { models: ModelInfo[]; expiresAt: number } | null = null
let catalogRequest: Promise<ModelInfo[]> | null = null

export class OpenRouterProvider implements ModelProvider {
  private client: OpenRouter

  constructor(settings: ProviderSettings) {
    this.client = new OpenRouter({
      apiKey: settings.OPENROUTER_API_KEY,
      httpReferer: settings.OPENROUTER_HTTP_REFERER,
      appTitle: settings.OPENROUTER_APP_TITLE ?? 'GameBench',
      appCategories: 'benchmark,games',
      retryConfig: { strategy: 'none' },
    })
  }

  async listModels(): Promise<ModelInfo[]> {
    if (catalog && catalog.expiresAt > Date.now()) return catalog.models
    catalogRequest ??= this.loadCatalog().finally(() => {
      catalogRequest = null
    })
    return catalogRequest
  }

  private async loadCatalog(): Promise<ModelInfo[]> {
    const response = await this.client.models.list(
      {},
      { timeoutMs: 15000, retries: { strategy: 'none' } },
    )
    const allModels = []
    for await (const page of response) allModels.push(...page.result.data)
    const models = allModels
      .filter(
        (model) =>
          model.architecture.outputModalities.includes('text') &&
          model.architecture.outputModalities.length === 1 &&
          !model.id.startsWith('openrouter/'),
      )
      .map((model) => ({
        id: model.id,
        name: model.name,
        contextLength: model.contextLength ?? 0,
        inputPrice: Number(model.pricing.prompt),
        outputPrice: Number(model.pricing.completion),
        requestPrice: Number(model.pricing.request ?? 0),
      }))
      .filter((model) =>
        [model.inputPrice, model.outputPrice, model.requestPrice].every(
          (price) => Number.isFinite(price) && price >= 0,
        ),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
    catalog = { models, expiresAt: Date.now() + 300000 }
    return models
  }

  async complete(
    model: ModelInfo,
    prompt: string,
    config: RunConfig,
    onProgress?: (text: string, reasoning: string) => void,
  ) {
    try {
      const response = await this.client.chat.send(
        {
          chatRequest: {
            model: model.id,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: prompt },
            ],
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            stream: true,
            provider: {
              sort: 'price',
              requireParameters: true,
              maxPrice: {
                prompt: String(model.inputPrice * 1_000_000),
                completion: String(model.outputPrice * 1_000_000),
                request: String(model.requestPrice),
              },
            },
          },
          xOpenRouterMetadata: 'enabled',
        },
        { signal: AbortSignal.timeout(config.timeoutMs), retries: { strategy: 'none' } },
      )
      if (!(Symbol.asyncIterator in response))
        throw new ProviderError('Expected a streaming model response.')
      let text = '',
        reasoning = '',
        lastProgress = 0
      let usage,
        provider: string | null = null,
        responseModel: string | null = null,
        generationId: string | null = null
      let finished = false
      for await (const chunk of response) {
        if (chunk.error)
          throw new ProviderError(
            'The upstream model stopped streaming. Resume to retry the request.',
          )
        const delta = chunk.choices[0]?.delta
        text = (text + (delta?.content ?? '')).slice(0, 32000)
        const reasoningText =
          delta?.reasoning ??
          delta?.reasoningDetails
            ?.map((detail) =>
              detail.type === 'reasoning.text'
                ? (detail.text ?? '')
                : detail.type === 'reasoning.summary'
                  ? detail.summary
                  : '',
            )
            .join('') ??
          ''
        reasoning = (reasoning + reasoningText).slice(0, 32000)
        usage = chunk.usage ?? usage
        generationId = chunk.id
        responseModel = chunk.model
        provider =
          chunk.openrouterMetadata?.attempts?.findLast((attempt) => attempt.status === 200)
            ?.provider ?? provider
        if (chunk.choices.some((choice) => choice.finishReason != null)) finished = true
        if (Date.now() - lastProgress >= 150) {
          onProgress?.(text, reasoning)
          lastProgress = Date.now()
        }
      }
      if (!finished)
        throw new ProviderError(
          'The model stream ended before completion. Resume to retry the request.',
        )
      onProgress?.(text, reasoning)
      const costEstimated = usage?.cost == null
      return {
        text,
        reasoning,
        inputTokens: usage?.promptTokens ?? 0,
        outputTokens: usage?.completionTokens ?? 0,
        costUsd:
          usage?.cost ??
          (usage
            ? usage.promptTokens * model.inputPrice +
              usage.completionTokens * model.outputPrice +
              model.requestPrice
            : requestReserve(model, prompt, config.maxTokens)),
        costEstimated,
        provider,
        responseModel,
        generationId,
      }
    } catch (error) {
      if (error instanceof ProviderError) throw error
      const name = error instanceof Error ? error.name : ''
      if (/Timeout|Aborted|AbortError/.test(name))
        throw new ProviderError('Model request exceeded the configured time limit.', 'timeout')
      const code =
        error && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : 0
      const message =
        code === 401 || code === 403
          ? 'OpenRouter rejected the API key. Fix the server key, then resume.'
          : code === 402
            ? 'OpenRouter credits are exhausted. Add credits, then resume.'
            : code === 429
              ? 'OpenRouter rate limit reached. Wait before resuming this run.'
              : code === 400 || code === 404
                ? 'The model cannot serve this protocol or price limit. Check model availability and parameters.'
                : 'OpenRouter is unavailable. Retry by resuming the run.'
      console.error('OpenRouter request failed', name, code)
      throw new ProviderError(message)
    }
  }
}
