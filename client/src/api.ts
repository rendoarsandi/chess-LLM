const API_URL = '/api'

export interface Game {
  id: string
  whitePlayerId: string
  blackPlayerId: string
  status: 'ongoing' | 'completed' | 'draw' | 'paused'
  fen: string
  winnerId: string | null
  gameOverReason?: string | null
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
  wins: number
  losses: number
  draws: number
  peakRating: number
  version?: string
  provider?: string
  bio?: string
  createdAt: string
}

export interface PlayerStats {
  favoriteOpenings: { opening: string, count: number }[]
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

export async function getGames(): Promise<Game[]> {
  const res = await fetch(`${API_URL}/games`)
  return res.json()
}

export async function getGame(id: string): Promise<Game> {
  const res = await fetch(`${API_URL}/games/${id}`)
  return res.json()
}

export async function deleteGame(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/games/${id}`, {
    method: 'DELETE'
  })
  return res.json()
}

export async function pauseGame(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/games/${id}/pause`, {
    method: 'POST'
  })
  return res.json()
}

export async function resumeGame(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/games/${id}/resume`, {
    method: 'POST'
  })
  return res.json()
}

export async function getMoves(gameId: string): Promise<Move[]> {
  const res = await fetch(`${API_URL}/games/${gameId}/moves`)
  return res.json()
}

export async function createGame(whitePlayerId: string, blackPlayerId: string): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/games`, {
    method: 'POST',
    body: JSON.stringify({ whitePlayerId, blackPlayerId }),
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

export async function makeMove(id: string, move: string, thinking?: { reasoning?: string, candidates?: string, opening?: string, thinkingMs?: number }): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/games/${id}/move`, {
    method: 'POST',
    body: JSON.stringify({ move, thinking }),
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

export async function getPlayers(): Promise<Player[]> {
  const res = await fetch(`${API_URL}/players`)
  return res.json()
}

export async function getLeaderboard(): Promise<Player[]> {
  const res = await fetch(`${API_URL}/leaderboard`)
  return res.json()
}

export async function getPlayerStats(id: string): Promise<PlayerStats> {
  const res = await fetch(`${API_URL}/players/${id}/stats`)
  return res.json()
}

export async function getPlayerProfile(id: string): Promise<Player> {
  const res = await fetch(`${API_URL}/players/${id}/profile`)
  return res.json()
}

export async function getEloHistory(id: string, period: string = 'all'): Promise<EloSnapshot[]> {
  const res = await fetch(`${API_URL}/players/${id}/elo-history?period=${period}`)
  return res.json()
}

export async function getHeadToHead(id: string): Promise<HeadToHeadRecord[]> {
  const res = await fetch(`${API_URL}/players/${id}/head-to-head`)
  return res.json()
}

// Admin API
export async function getAdminModels(): Promise<LLMConfig[]> {
  const res = await fetch(`${API_URL}/admin/models`)
  return res.json()
}

export async function createAdminModel(config: Partial<LLMConfig>): Promise<LLMConfig> {
  const res = await fetch(`${API_URL}/admin/models`, {
    method: 'POST',
    body: JSON.stringify(config),
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

export async function updateAdminModel(id: number, config: Partial<LLMConfig>): Promise<LLMConfig> {
  const res = await fetch(`${API_URL}/admin/models/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(config),
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

export async function deleteAdminModel(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/admin/models/${id}`, {
    method: 'DELETE'
  })
  return res.json()
}

// Tournament API
export async function getTournaments(): Promise<Tournament[]> {
  const res = await fetch(`${API_URL}/tournaments`)
  return res.json()
}

export async function getTournament(id: string): Promise<Tournament> {
  const res = await fetch(`${API_URL}/tournaments/${id}`)
  return res.json()
}

export async function createTournament(data: {
  name: string,
  startTime: string,
  totalRounds: number,
  timeControlSettings?: string,
  participantIds: string[]
}): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/tournaments`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

export async function getTournamentParticipants(id: string): Promise<TournamentParticipant[]> {
  const res = await fetch(`${API_URL}/tournaments/${id}/participants`)
  return res.json()
}

export async function getTournamentGames(id: string): Promise<Game[]> {
  const res = await fetch(`${API_URL}/tournaments/${id}/games`)
  return res.json()
}

// Game Review API
export interface GameReview {
  id: string;
  gameId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  workerId?: string;
  progressCurrent: number;
  progressTotal: number;
}

export interface MoveAnalysis {
  moveNumber: number;
  classification: string;
  evaluation: number;
  bestLine?: string;
}

export async function requestReview(gameId: string): Promise<GameReview> {
  const res = await fetch(`${API_URL}/reviews/${gameId}`, { method: 'POST' });
  return res.json();
}

export async function getReviewStatus(gameId: string): Promise<GameReview & { analyses?: MoveAnalysis[] }> {
  const res = await fetch(`${API_URL}/reviews/${gameId}`);
  return res.json();
}

export async function claimJob(workerId: string): Promise<GameReview | { message: string }> {
  const res = await fetch(`${API_URL}/reviews/worker/claim`, {
    method: 'POST',
    body: JSON.stringify({ workerId }),
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function sendHeartbeat(reviewId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/reviews/worker/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({ reviewId }),
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function updateProgress(reviewId: string, current: number, total: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/reviews/worker/progress`, {
    method: 'POST',
    body: JSON.stringify({ reviewId, current, total }),
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function submitResults(reviewId: string, results: MoveAnalysis[]): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/reviews/worker/submit`, {
    method: 'POST',
    body: JSON.stringify({ reviewId, results }),
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}