import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GameHistory } from './GameHistory'
import type { Game } from '@/api'

describe('GameHistory', () => {
  const mockGames: Game[] = [
    {
      id: 'game-id-1',
      whitePlayerId: 'p1',
      blackPlayerId: 'p2',
      status: 'ongoing',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      winnerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'game-id-2',
      whitePlayerId: 'p3',
      blackPlayerId: 'p4',
      status: 'completed',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      winnerId: 'p3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]

  it('renders "No games found" when empty', () => {
    render(<GameHistory games={[]} onSelect={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/no games found/i)).toBeInTheDocument()
  })

  it('renders a list of games', () => {
    render(<GameHistory games={mockGames} onSelect={() => {}} onDelete={() => {}} />)
    const gameTitles = screen.getAllByText(/game game-id-/i)
    expect(gameTitles).toHaveLength(2)
  })

  it('calls onSelect when view button is clicked', () => {
    const onSelect = vi.fn()
    render(<GameHistory games={mockGames} onSelect={onSelect} onDelete={() => {}} />)
    
    const viewButtons = screen.getAllByText(/view/i)
    fireEvent.click(viewButtons[0])
    
    expect(onSelect).toHaveBeenCalledWith(mockGames[0])
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<GameHistory games={mockGames} onSelect={() => {}} onDelete={onDelete} />)
    
    const deleteButtons = screen.getAllByText(/delete/i)
    fireEvent.click(deleteButtons[0])
    
    expect(onDelete).toHaveBeenCalledWith(mockGames[0].id)
  })
})
