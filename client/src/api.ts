const API_URL = 'http://localhost:3001/api'

export interface Game {
  id: string
  whitePlayerId: string
  blackPlayerId: string
  status: 'ongoing' | 'completed' | 'draw'
  fen: string
  winnerId: string | null
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
  createdAt: string
}

export interface PlayerStats {
  favoriteOpenings: { opening: string, count: number }[]
  avgThinkingMs: number | null
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
