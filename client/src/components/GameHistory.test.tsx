import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GameHistory } from './GameHistory'
import { Game } from '@/api'

describe('GameHistory', () => {
  const mockGames: Game[] = [
    {
      id: 'game1',
      whitePlayerId: 'p1',
      blackPlayerId: 'p2',
      status: 'ongoing',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      winnerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]

  it('renders the list of games', () => {
    render(<GameHistory games={mockGames} onSelect={() => {}} />)
    expect(screen.getByText(/Game game1/)).toBeInTheDocument()
  })

  it('calls onSelect when View button is clicked', () => {
    const onSelect = vi.fn()
    render(<GameHistory games={mockGames} onSelect={onSelect} />)
    const button = screen.getByText('View')
    fireEvent.click(button)
    expect(onSelect).toHaveBeenCalledWith(mockGames[0])
  })
})
