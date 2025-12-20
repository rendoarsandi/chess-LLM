import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PlayerProfile } from './PlayerProfile'
import * as api from '@/api'

vi.mock('@/api', async () => {
  const actual = await vi.importActual('@/api')
  return {
    ...actual,
    getPlayerStats: vi.fn(),
  }
})

describe('PlayerProfile', () => {
  const mockPlayer: api.Player = {
    id: 'p1',
    name: 'Stockfish 16',
    type: 'llm',
    rating: 2850,
    wins: 10,
    losses: 2,
    draws: 5,
    peakRating: 2900,
    createdAt: ''
  }

  const mockStats: api.PlayerStats = {
    favoriteOpenings: [
      { opening: 'Ruy Lopez', count: 5 },
      { opening: 'Sicilian Defense', count: 3 }
    ],
    avgThinkingMs: 1500
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(api.getPlayerStats as Mock).mockResolvedValue(mockStats)
  })

  it('renders player basic info when open', async () => {
    render(<PlayerProfile player={mockPlayer} open={true} onOpenChange={() => {}} />)
    
    expect(screen.getByText('Stockfish 16')).toBeInTheDocument()
    expect(screen.getByText(/llm Player • Rating 2850/i)).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument() // Wins
  })

  it('fetches and displays player stats', async () => {
    render(<PlayerProfile player={mockPlayer} open={true} onOpenChange={() => {}} />)
    
    await waitFor(() => {
      expect(screen.getByText('Ruy Lopez')).toBeInTheDocument()
      expect(screen.getByText('5 games')).toBeInTheDocument()
      expect(screen.getByText('1.5s')).toBeInTheDocument() // Avg thinking time
    })
  })

  it('renders nothing when closed', () => {
    render(<PlayerProfile player={mockPlayer} open={false} onOpenChange={() => {}} />)
    // When closed, DialogContent is usually not in DOM or Dialog is not open
    // Simple check: player name shouldn't be visible if it's not rendered
    expect(screen.queryByText('Stockfish 16')).not.toBeInTheDocument()
  })
})
