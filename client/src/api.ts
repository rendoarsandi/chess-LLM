const API_URL = '/api'

export interface Game {
  id: string
  whitePlayerId: string
  blackPlayerId: string
  status: 'ongoing' | 'completed' | 'draw' | 'paused'
  fen: string
  winnerId: string | null
  gameOverReason?: string | null
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
  createdAt: string
}

export async function getGames(): Promise<Game[]> {
  const res = await fetch(`${API_URL}/games`)
  return res.json()
}

export async function getGame(id: string): Promise<Game> {
  const res = await fetch(`${API_URL}/games/${id}`)
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

export async function deleteGame(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/games/${id}`, {
    method: 'DELETE'
  })
  return res.json()
}

export async function clearHistory(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/games`, {
    method: 'DELETE'
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