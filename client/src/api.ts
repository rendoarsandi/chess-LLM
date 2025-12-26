const API_URL = '/api'

export interface Game {
  id: string
  whitePlayerId: string
  blackPlayerId: string
  status: 'ongoing' | 'completed' | 'draw' | 'paused'
  variant: 'standard' | 'chess960'
  startPosId?: number | null
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
  rating960: number
  wins: number
  losses: number
  draws: number
  peakRating: number
  peakRating960: number
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
  if (!res.ok) throw new Error('Failed to fetch games')
  return res.json()
}

export async function getGame(id: string): Promise<Game> {
  const res = await fetch(`${API_URL}/games/${id}`)
  if (!res.ok) throw new Error('Failed to fetch game')
  return res.json()
}

export async function deleteGame(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/games/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete game')
  return res.json()
}

export async function pauseGame(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/games/${id}/pause`, {
    method: 'POST'
  })
  if (!res.ok) throw new Error('Failed to pause game')
  return res.json()
}

export async function resumeGame(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/games/${id}/resume`, {
    method: 'POST'
  })
  if (!res.ok) throw new Error('Failed to resume game')
  return res.json()
}

export async function getMoves(gameId: string): Promise<Move[]> {
  const res = await fetch(`${API_URL}/games/${gameId}/moves`)
  if (!res.ok) throw new Error('Failed to fetch moves')
  return res.json()
}

export async function createGame(whitePlayerId: string, blackPlayerId: string, options?: { variant?: string, startPosId?: number }): Promise<{ id: string }> {
  const response = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whitePlayerId, blackPlayerId, ...options }),
  })
  if (!response.ok) throw new Error('Failed to create game')
  return response.json()
}

export async function makeMove(id: string, move: string, thinking?: { reasoning?: string, candidates?: string, opening?: string, thinkingMs?: number }): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/games/${id}/move`, {
    method: 'POST',
    body: JSON.stringify({ move, thinking }),
    headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to make move')
  }
  return res.json()
}

export async function getPlayers(): Promise<Player[]> {
  const res = await fetch(`${API_URL}/players`)
  if (!res.ok) throw new Error('Failed to fetch players')
  return res.json()
}

export async function getLeaderboard(): Promise<Player[]> {
  const res = await fetch(`${API_URL}/leaderboard`)
  if (!res.ok) throw new Error('Failed to fetch leaderboard')
  return res.json()
}

export async function getPlayerStats(id: string): Promise<PlayerStats> {
  const res = await fetch(`${API_URL}/players/${id}/stats`)
  if (!res.ok) throw new Error('Failed to fetch player stats')
  return res.json()
}

export async function getPlayerProfile(id: string): Promise<Player> {
  const res = await fetch(`${API_URL}/players/${id}/profile`)
  if (!res.ok) throw new Error('Failed to fetch player profile')
  return res.json()
}

export async function getEloHistory(id: string, period: string = 'all'): Promise<EloSnapshot[]> {
  const res = await fetch(`${API_URL}/players/${id}/elo-history?period=${period}`)
  if (!res.ok) throw new Error('Failed to fetch ELO history')
  return res.json()
}

export async function getHeadToHead(id: string): Promise<HeadToHeadRecord[]> {
  const res = await fetch(`${API_URL}/players/${id}/head-to-head`)
  if (!res.ok) throw new Error('Failed to fetch head-to-head records')
  return res.json()
}

export async function clearHistory(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/games`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to clear history')
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

export async function getTournamentParticipantsGrouped(id: string): Promise<TournamentParticipant[]> {
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
  playerColor: 'white' | 'black';
  classification: string;
  evaluation: number;
  bestLine?: string;
}

export async function requestReview(gameId: string): Promise<GameReview> {
  const res = await fetch(`${API_URL}/reviews/${gameId}`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to request review');
  }
  return res.json();
}

export async function getReviewStatus(gameId: string): Promise<GameReview & { analyses?: MoveAnalysis[] }> {
  const res = await fetch(`${API_URL}/reviews/${gameId}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch review status');
  }
  return res.json();
}

export async function claimJob(workerId: string): Promise<GameReview | { message: string }> {
  const res = await fetch(`${API_URL}/reviews/worker/claim`, {
    method: 'POST',
    body: JSON.stringify({ workerId }),
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to claim job');
  return res.json();
}

export async function sendHeartbeat(reviewId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/reviews/worker/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({ reviewId }),
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to send heartbeat');
  return res.json();
}

export async function updateProgress(reviewId: string, current: number, total: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/reviews/worker/progress`, {
    method: 'POST',
    body: JSON.stringify({ reviewId, current, total }),
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to update progress');
  return res.json();
}

export async function submitResults(reviewId: string, results: MoveAnalysis[]): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/reviews/worker/submit`, {
    method: 'POST',
    body: JSON.stringify({ reviewId, results }),
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to submit results');
  return res.json();
}

export async function reportFailure(reviewId: string, error: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/reviews/worker/failure`, {
    method: 'POST',
    body: JSON.stringify({ reviewId, error }),
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to report failure');
  return res.json();
}