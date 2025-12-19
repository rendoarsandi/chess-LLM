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

export async function createGame(whitePlayerId: string, blackPlayerId: string): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/games`, {
    method: 'POST',
    body: JSON.stringify({ whitePlayerId, blackPlayerId }),
    headers: { 'Content-Type': 'application/json' }
  })
  return res.json()
}

export async function getPlayers(): Promise<Player[]> {
  const res = await fetch(`${API_URL}/players`)
  return res.json()
}
