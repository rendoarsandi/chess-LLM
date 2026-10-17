import type { Match, RunStatus } from './protocol'

export interface McpCredential {
  modelId: string
  token: string
}

export type McpOperation =
  | { type: 'identity' }
  | { type: 'list' }
  | { type: 'state'; matchId: string }
  | { type: 'join'; matchId: string }
  | {
      type: 'move'
      matchId: string
      moveId: string
      expectedPly: number
      expectedFen: string
      action: string
      explanation?: string
    }

export interface McpMatchState {
  runId: string
  matchId: string
  modelId: string
  modelIds: [string, string]
  seat: 'white' | 'black'
  joined: [boolean, boolean]
  runStatus: RunStatus
  status: Match['status']
  ply: number
  fen: string
  pgn: string
  turn: 'white' | 'black'
  yourTurn: boolean
  legalActions: string[]
  result: Match['result']
  attemptsRemaining: number
  nextTool: 'join_match' | 'wait_for_turn' | 'submit_move' | 'list_matches'
}

export interface McpReply {
  modelId: string
  matches?: McpMatchState[]
  state?: McpMatchState
  receipt?: {
    moveId: string
    ply: number
    accepted: boolean
    replayed: boolean
    error: string | null
  }
}
