import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import App from './App'
import * as api from './api'

// Mock the API
vi.mock('./api', () => ({
  getGames: vi.fn(),
  getGame: vi.fn(),
  getMoves: vi.fn(),
  getPlayers: vi.fn(),
  getLeaderboard: vi.fn(),
  createGame: vi.fn(),
  deleteGame: vi.fn(),
  clearHistory: vi.fn(),
}))

describe('App Integration', () => {
  const mockPlayers = [
    { id: 'p1', name: 'Player 1', type: 'llm', rating: 1200, wins: 0, losses: 0, draws: 0, peakRating: 1200, createdAt: '' },
    { id: 'p2', name: 'Player 2', type: 'llm', rating: 1200, wins: 0, losses: 0, draws: 0, peakRating: 1200, createdAt: '' },
  ]

  const mockGame = {
    id: 'game-1',
    whitePlayerId: 'p1',
    blackPlayerId: 'p2',
    status: 'ongoing',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(api.getPlayers as Mock).mockResolvedValue(mockPlayers)
    ;(api.getLeaderboard as Mock).mockResolvedValue(mockPlayers)
    ;(api.getGames as Mock).mockResolvedValue([mockGame])
    ;(api.getGame as Mock).mockResolvedValue(mockGame)
    ;(api.getMoves as Mock).mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates board FEN when moves are fetched', async () => {
    // Initial render
    render(<App />)

    // Wait for initial load
    await waitFor(() => expect(api.getGames).toHaveBeenCalled())

    // Simulate a new move being found during polling
    const moveFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const mockMove = {
      id: 1,
      gameId: 'game-1',
      moveNumber: 1,
      playerColor: 'white',
      move: 'e4',
      fen: moveFen,
      createdAt: new Date().toISOString(),
    }

    // Update mock for the next poll
    ;(api.getMoves as Mock).mockResolvedValue([mockMove])

    // Verify the move e4 appears in the move list
    await waitFor(() => {
      expect(screen.getAllByText('e4').length).toBeGreaterThan(0)
    }, { timeout: 8000 })
  }, 10000)

  it('shows BROWSING HISTORY badge when navigating back', async () => {
    const mockMoves = [
      {
        id: 1,
        gameId: 'game-1',
        moveNumber: 1,
        playerColor: 'white',
        move: 'e4',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        gameId: 'game-1',
        moveNumber: 1,
        playerColor: 'black',
        move: 'e5',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        createdAt: new Date().toISOString(),
      }
    ]
    
    ;(api.getMoves as Mock).mockResolvedValue(mockMoves)

    render(<App />)

    await waitFor(() => expect(screen.getAllByText('e5').length).toBeGreaterThan(0), { timeout: 8000 })

    // Click the first move (e4) to enter browsing mode
    const moveButton = screen.getAllByText('e4')[0]
    fireEvent.click(moveButton)

    expect(screen.getByText('HISTORY MODE')).toBeInTheDocument()
  }, 10000)

  it('navigates to profiles view when sidebar button is clicked', async () => {
    render(<App />)

    const profilesButton = screen.getAllByText('PROFILES')[0]
    expect(profilesButton).toBeInTheDocument()

    fireEvent.click(profilesButton)

    // After click, we expect the header to show PROFILES too
    await waitFor(() => {
      expect(screen.getAllByText('PROFILES').length).toBeGreaterThanOrEqual(2)
    })
  })
})
    