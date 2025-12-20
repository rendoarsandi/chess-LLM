import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PlayerProfile } from './PlayerProfile'
import * as api from '@/api'

// Mock ResizeObserver for Recharts
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))

vi.mock('@/api', async () => {
  const actual = await vi.importActual('@/api')
  return {
    ...actual,
    getPlayerProfile: vi.fn(),
    getEloHistory: vi.fn(),
    getHeadToHead: vi.fn(),
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
    createdAt: new Date().toISOString(),
    provider: 'Arena',
    version: '16'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(api.getPlayerProfile as Mock).mockResolvedValue(mockPlayer)
    ;(api.getEloHistory as Mock).mockResolvedValue([])
    ;(api.getHeadToHead as Mock).mockResolvedValue([])
  })

  it('renders player profile data correctly', async () => {
    render(<PlayerProfile playerId="p1" onBack={() => {}} />)
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/Retrieving Profile Data.../i)).not.toBeInTheDocument()
    })

    expect(screen.getByText('Stockfish 16')).toBeInTheDocument()
    expect(screen.getByText(/2850 ELO/i)).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument() // Wins
    expect(screen.getByText('2')).toBeInTheDocument() // Losses
    expect(screen.getByText('5')).toBeInTheDocument() // Draws
  })

  it('shows error state when player not found', async () => {
    ;(api.getPlayerProfile as Mock).mockResolvedValue(null)
    render(<PlayerProfile playerId="non-existent" onBack={() => {}} />)
    
        await waitFor(() => {
    
          expect(screen.getByText(/Model profile not found/i)).toBeInTheDocument()
    
        })
    
      })
    
    
    
      it('shows error state when fetch fails', async () => {
    
        ;(api.getPlayerProfile as Mock).mockRejectedValue(new Error('Fetch failed'))
    
        render(<PlayerProfile playerId="p1" onBack={() => {}} />)
    
        
    
        await waitFor(() => {
    
          expect(screen.getByText(/Failed to load model profile data/i)).toBeInTheDocument()
    
        })
    
      })
    
    })
    
    