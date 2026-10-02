import type { MatchResult } from '../../../shared/protocol'

export interface GameObservation {
  prompt: string
  legalActions: string[]
  turn: number
  view: { kind: string; fen?: string }
}

/** The runner treats game state and actions as opaque strings. */
export interface GameAdapter {
  id: string
  name: string
  protocolVersion: string
  seatNames: readonly [string, string]
  initialState(): string
  observe(state: string): GameObservation
  apply(state: string, action: string): { state: string; result: MatchResult | null }
}
