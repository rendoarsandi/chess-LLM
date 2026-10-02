import type {
  Attempt,
  Health,
  ModelInfo,
  RunInput,
  RunSnapshot,
  RunSummary,
} from '../../shared/protocol'

export const tokenKey = 'gamebench-admin-token'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.method ? { 'x-admin-token': sessionStorage.getItem(tokenKey) ?? '' } : {}),
      ...options?.headers,
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status}).`)
  return data as T
}

export const api = {
  health: () => request<Health>('/health'),
  models: () => request<ModelInfo[]>('/models'),
  runs: () => request<RunSummary[]>('/runs'),
  run: (id: string) => request<RunSnapshot>(`/runs/${id}`),
  create: (input: RunInput, id: string) =>
    request<RunSnapshot>('/runs', {
      method: 'POST',
      headers: { 'Idempotency-Key': id },
      body: JSON.stringify(input),
    }),
  command: (id: string, action: 'pause' | 'resume' | 'cancel') =>
    request<RunSnapshot>(`/runs/${id}/${action}`, { method: 'POST' }),
  attempts: (id: string, matchId: string) =>
    request<Attempt[]>(`/runs/${id}/matches/${matchId}/attempts`),
}

export const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 0.01 && value > 0 ? 5 : 2,
  }).format(value)

export function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
