import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Leaderboard } from './Leaderboard'
import type { Player } from '@/api'

describe('Leaderboard', () => {
  const mockPlayers: Player[] = [
    {
      id: '1',
      name: 'Stockfish 16',
      type: 'llm',
      rating: 2850,
      wins: 10,
      losses: 2,
      draws: 5,
      peakRating: 2900,
      createdAt: ''
    },
    {
      id: '2',
      name: 'Gemini Flash',
      type: 'llm',
      rating: 2700,
      wins: 5,
      losses: 5,
      draws: 7,
      peakRating: 2750,
      createdAt: ''
    }
  ]

  it('renders players in ranked order', () => {
    render(<Leaderboard players={mockPlayers} />)
    
    expect(screen.getByText('Stockfish 16')).toBeInTheDocument()
    expect(screen.getByText('Gemini Flash')).toBeInTheDocument()
    expect(screen.getByText('2850')).toBeInTheDocument()
    expect(screen.getByText('2700')).toBeInTheDocument()
    
    // Check headers
    expect(screen.getByText('Rank')).toBeInTheDocument()
    expect(screen.getByText('Player')).toBeInTheDocument()
    expect(screen.getByText('ELO')).toBeInTheDocument()
    expect(screen.getByText('W/L/D')).toBeInTheDocument()
  })

  it('sorts players by rating in descending order', () => {
    const unsortedPlayers: Player[] = [
      {
        id: '1',
        name: 'Lower Rated',
        type: 'llm',
        rating: 1000,
        wins: 0,
        losses: 0,
        draws: 0,
        peakRating: 1000,
        createdAt: ''
      },
      {
        id: '2',
        name: 'Higher Rated',
        type: 'llm',
        rating: 2000,
        wins: 0,
        losses: 0,
        draws: 0,
        peakRating: 2000,
        createdAt: ''
      }
    ]

    render(<Leaderboard players={unsortedPlayers} />)

    const rows = screen.getAllByRole('row')
    // row 0 is header
    expect(rows[1]).toHaveTextContent('Higher Rated')
    expect(rows[2]).toHaveTextContent('Lower Rated')
  })

  it('displays win/loss/draw records correctly', () => {
    render(<Leaderboard players={mockPlayers} />)
    expect(screen.getByText('10/2/5')).toBeInTheDocument()
    expect(screen.getByText('5/5/7')).toBeInTheDocument()
  })

  it('displays an empty message when no players are provided', () => {
    render(<Leaderboard players={[]} />)
    expect(screen.getByText(/No players found/i)).toBeInTheDocument()
  })
})
