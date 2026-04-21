export interface ThinkingData {
  opening?: string
  candidates?: string[]
  reasoning?: string
}

export interface Game {
  id: string
  whitePlayerId: string
  blackPlayerId: string
  status: 'ongoing' | 'completed' | 'draw' | 'paused'
  variant: 'standard' | 'chess960'
  startPosId?: number | null
  fen: string
  winnerId?: string | null
  gameOverReason?: string | null
  pgn?: string | null
  tournamentId?: string | null
  roundNumber?: number | null
  createdAt: string
  updatedAt: string
}

export interface Player {
  id: string
  name: string
  type: 'llm' | 'human'
  rating: number
  rating960: number
  wins: number
  losses: number
  draws: number
  wins960: number
  losses960: number
  draws960: number
  peakRating: number
  peakRating960: number
  provider?: string
  version?: string
  bio?: string
  createdAt: string
}

export interface Move {
  id: number
  gameId: string
  moveNumber: number
  playerColor: 'white' | 'black'
  move: string
  fen: string
  opening?: string
  candidates?: string
  reasoning?: string
  thinkingMs?: number
  createdAt?: string
}

export interface PlayerStats {
  favoriteOpenings: { opening: string; count: number }[]
  avgThinkingMs: number | null
}

export interface EloSnapshot {
  id: number
  playerId: string
  rating: number
  gameId: string | null
  createdAt: string
}

export interface HeadToHeadRecord {
  opponentId: string
  opponentName: string
  wins: number
  losses: number
  draws: number
}

export interface LLMConfig {
  id: number
  provider: string
  modelId: string
  apiKey: string | null
  isActive: boolean
  isHardcoded: boolean
  createdAt: string
  updatedAt: string
}

export interface MatchmakingPlayer {
  id: string
  name: string
  provider: string | null
  modelId: string | null
  rating: number
  rating960: number
}

export interface MatchmakingPair {
  white: MatchmakingPlayer
  black: MatchmakingPlayer
  variant: 'standard' | 'chess960'
  gamesPlayed: number
  ratingGap: number
  reason: string
}

export interface MatchmakingStatus {
  enabled: boolean
  intervalMs: number
  variant: 'standard' | 'chess960'
  ongoingGames: number
  eligiblePlayers: MatchmakingPlayer[]
  nextPair: MatchmakingPair | null
}

export type MatchmakingRunResult =
  | { created: true; gameId: string; pair: MatchmakingPair }
  | { created: false; reason: string; status: MatchmakingStatus }

export interface Tournament {
  id: string
  name: string
  status: 'scheduled' | 'active' | 'completed'
  startTime: string
  timeControlSettings: string | null
  currentRound: number
  totalRounds: number
  createdAt: string
}

export interface TournamentParticipant extends Player {
  score: number
  buchholz: number
}

export interface GameReview {
  id: string
  gameId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  workerId?: string
  progressCurrent: number
  progressTotal: number
}

export interface MoveAnalysis {
  moveNumber: number
  playerColor: 'white' | 'black'
  classification: string
  evaluation: number
  bestLine?: string
}
