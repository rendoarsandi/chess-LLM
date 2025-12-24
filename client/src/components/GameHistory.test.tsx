import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameHistory } from './GameHistory';
import type { Game, Player } from '../api';

describe('GameHistory', () => {
  const mockGames: Game[] = [
    { 
      id: 'game-1', 
      whitePlayerId: 'p1', 
      blackPlayerId: 'p2', 
      status: 'completed', 
      createdAt: new Date().toISOString(), 
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 
      updatedAt: new Date().toISOString(),
      winnerId: 'p1',
      gameOverReason: 'checkmate'
    },
  ];
  const mockPlayers: Player[] = [
    { id: 'p1', name: 'White', type: 'llm', rating: 1200, wins: 0, losses: 0, draws: 0, peakRating: 1200, createdAt: '' },
    { id: 'p2', name: 'Black', type: 'llm', rating: 1200, wins: 0, losses: 0, draws: 0, peakRating: 1200, createdAt: '' },
  ];

  it('renders history title', () => {
    render(<GameHistory games={mockGames} players={mockPlayers} onSelect={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/Game History/i)).toBeDefined();
  });

  it('renders game entries', () => {
    render(<GameHistory games={mockGames} players={mockPlayers} onSelect={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/White/i)).toBeDefined();
    expect(screen.getByText(/Black/i)).toBeDefined();
  });
});