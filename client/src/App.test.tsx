import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import App from './App'
import * as api from './api'

// Mock the API
vi.mock('./api', () => ({
  getGames: vi.fn(),
  getGame: vi.fn(),
  getMoves: vi.fn(),
  getPlayers: vi.fn(),
  createGame: vi.fn(),
  deleteGame: vi.fn(),
  clearHistory: vi.fn(),
}))

describe('App Integration', () => {
  const mockPlayers = [
    { id: 'p1', name: 'Player 1', type: 'llm' },
    { id: 'p2', name: 'Player 2', type: 'llm' },
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

    // Check if the board (or FEN display) reflects the new state
    await waitFor(() => {
      // The FEN is displayed in a code tag in the Game info section
      const fenElements = screen.getAllByText(moveFen, { exact: false })
      expect(fenElements.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('shows BROWSING HISTORY badge when navigating back', async () => {
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
    
    ;(api.getMoves as Mock).mockResolvedValue([mockMove])

    render(<App />)

    await waitFor(() => expect(screen.getByText('e4')).toBeInTheDocument(), { timeout: 3000 })

    // Click the move to enter browsing mode
    const moveButton = screen.getByText('e4')
    fireEvent.click(moveButton)

    expect(screen.getByText('BROWSING HISTORY')).toBeInTheDocument()
  })
})