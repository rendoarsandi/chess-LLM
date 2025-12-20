import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { MemoryRouter } from 'react-router';
import * as api from './api';

vi.mock('./api', () => ({
  getGames: vi.fn(),
  getGame: vi.fn(),
  getMoves: vi.fn(),
  getPlayers: vi.fn(),
  getLeaderboard: vi.fn(),
  createGame: vi.fn(),
  deleteGame: vi.fn(),
  pauseGame: vi.fn(),
  resumeGame: vi.fn(),
}));

describe('App Crash Reproduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getPlayers as any).mockResolvedValue([]);
    (api.getLeaderboard as any).mockResolvedValue([]);
    (api.getGames as any).mockResolvedValue([{ id: 'game-1', whitePlayerId: 'p1', blackPlayerId: 'p2', status: 'ongoing' }]);
    (api.getGame as any).mockResolvedValue({ id: 'game-1', whitePlayerId: 'p1', blackPlayerId: 'p2', status: 'ongoing' });
  });

  it('should handle invalid moves gracefully instead of crashing the entire app', async () => {
    // Simulate invalid moves arriving from the API
    const invalidMoves = [
      { id: 1, move: 'Nf3', playerColor: 'white' }, // Valid if starting position
      { id: 2, move: 'Nf3', playerColor: 'black' }, // INVALID: Black can't move Nf3 from start
    ];

    (api.getMoves as any).mockResolvedValue(invalidMoves);

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    // If it crashes, this test will fail. 
    // If it handles it (e.g. by catching in useMemo), it will render.
    // We expect it to render even with invalid moves if our try-catch works.
    const arenaTitles = await screen.findAllByText('ARENA');
    expect(arenaTitles[0]).toBeInTheDocument();
  });
});
