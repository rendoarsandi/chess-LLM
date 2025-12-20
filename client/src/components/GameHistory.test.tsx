import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GameHistory } from './GameHistory'
import type { Game, Player } from '@/api'

describe('GameHistory', () => {
  const mockPlayers: Player[] = [
    { id: 'p1', name: 'Stockfish', type: 'llm', rating: 1200, wins: 0, losses: 0, draws: 0, peakRating: 1200, createdAt: '' },
    { id: 'p2', name: 'Gemini', type: 'llm', rating: 1200, wins: 0, losses: 0, draws: 0, peakRating: 1200, createdAt: '' },
  ]

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
      whitePlayerId: 'p2',
      blackPlayerId: 'p1',
      status: 'completed',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      winnerId: 'p2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]

  it('renders "No games found" when empty', () => {
    render(<GameHistory games={[]} players={[]} onSelect={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/no games found/i)).toBeInTheDocument()
  })

  it('renders a list of games with player names', () => {
    render(<GameHistory games={mockGames} players={mockPlayers} onSelect={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Stockfish vs Gemini', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Gemini vs Stockfish', { selector: 'span' })).toBeInTheDocument()
  })

  it('calls onSelect when view button is clicked', () => {
    const onSelect = vi.fn()
    render(<GameHistory games={mockGames} players={mockPlayers} onSelect={onSelect} onDelete={() => {}} />)
    
    const viewButtons = screen.getAllByText(/view/i)
    fireEvent.click(viewButtons[0])
    
    expect(onSelect).toHaveBeenCalledWith(mockGames[0])
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<GameHistory games={mockGames} players={mockPlayers} onSelect={() => {}} onDelete={onDelete} />)
    
    const deleteButtons = screen.getAllByText(/delete/i)
    fireEvent.click(deleteButtons[0])
    
    expect(onDelete).toHaveBeenCalledWith(mockGames[0].id)
  })

  it('filters games by search query (player name)', async () => {
    const uniquePlayers: Player[] = [
      ...mockPlayers,
      { id: 'p3', name: 'AlphaZero', type: 'llm', rating: 1200, wins: 0, losses: 0, draws: 0, peakRating: 1200, createdAt: '' }
    ]
    const uniqueGames: Game[] = [
      ...mockGames,
      {
        id: 'game-id-3',
        whitePlayerId: 'p3',
        blackPlayerId: 'p1',
        status: 'completed',
        fen: 'fen',
        winnerId: 'p3',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    render(<GameHistory games={uniqueGames} players={uniquePlayers} onSelect={() => {}} onDelete={() => {}} />)
    const searchInput = screen.getByPlaceholderText(/search games.../i)
    
    fireEvent.change(searchInput, { target: { value: 'AlphaZero' } })
    expect(screen.getByText('AlphaZero vs Stockfish', { selector: 'span' })).toBeInTheDocument()
    expect(screen.queryByText('Stockfish vs Gemini', { selector: 'span' })).not.toBeInTheDocument()
  })

  it('filters games by search query (id)', async () => {
    render(<GameHistory games={mockGames} players={mockPlayers} onSelect={() => {}} onDelete={() => {}} />)
    
    const searchInput = screen.getByPlaceholderText(/search games.../i)
    fireEvent.change(searchInput, { target: { value: 'game-id-1' } })
    
    expect(screen.getByText(/game-id-/i, { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Stockfish vs Gemini', { selector: 'span' })).toBeInTheDocument()
    expect(screen.queryByText('Gemini vs Stockfish', { selector: 'span' })).not.toBeInTheDocument()
  })
})