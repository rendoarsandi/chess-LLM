import type { RunInput } from './protocol'

export class InputError extends Error {}

export function validateRunInput(value: unknown): RunInput {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new InputError('Expected a run configuration.')
  const data = value as Record<string, unknown>
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 80) {
    throw new InputError('Give the run a name between 1 and 80 characters.')
  }
  if (typeof data.gameId !== 'string') throw new InputError('Choose a game.')
  if (
    !Array.isArray(data.modelIds) ||
    data.modelIds.length < 2 ||
    data.modelIds.length > 8 ||
    data.modelIds.some((id) => typeof id !== 'string' || id.length > 160) ||
    new Set(data.modelIds).size !== data.modelIds.length
  ) {
    throw new InputError('Select 2–8 different models.')
  }
  function number(key: string, min: number, max: number, integer = true) {
    const value = data[key]
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (integer && !Number.isInteger(value))
    ) {
      throw new InputError(
        `${key} must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}.`,
      )
    }
    return value
  }
  return {
    name: data.name.trim(),
    gameId: data.gameId,
    modelIds: data.modelIds as string[],
    repetitions: number('repetitions', 1, 3),
    temperature: number('temperature', 0, 2, false),
    maxTokens: number('maxTokens', 128, 4096),
    maxPlies: number('maxPlies', 2, 400),
    maxAttempts: number('maxAttempts', 1, 3),
    timeoutMs: number('timeoutMs', 5000, 90000),
    budgetUsd: number('budgetUsd', 0.01, 100, false),
  }
}
