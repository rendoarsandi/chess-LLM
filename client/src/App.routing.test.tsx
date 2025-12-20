import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from './App';
import React from 'react';

// Mock the API calls to avoid network errors during tests
import * as api from './api';
import { vi } from 'vitest';

vi.mock('./api', () => ({
  getGames: vi.fn().mockResolvedValue([]),
  getGame: vi.fn().mockResolvedValue(null),
  getMoves: vi.fn().mockResolvedValue([]),
  getPlayers: vi.fn().mockResolvedValue([]),
  getLeaderboard: vi.fn().mockResolvedValue([]),
  createGame: vi.fn(),
  deleteGame: vi.fn(),
  pauseGame: vi.fn(),
  resumeGame: vi.fn(),
}));

describe('App Routing', () => {
  it('should render the Leaderboard when navigating to /leaderboard', async () => {
    render(
      <MemoryRouter initialEntries={['/leaderboard']}>
        <App />
      </MemoryRouter>
    );

    // Currently, it will render the default view (arena) regardless of URL
    // So we expect this to FAIL until we implement routing
    expect(screen.getByText('Model Rankings')).toBeInTheDocument();
  });

  it('should navigate from History back to Arena when a game is selected', async () => {
    const mockGames = [
      { id: 'game-1', whitePlayerId: 'p1', blackPlayerId: 'p2', status: 'completed' }
    ];
    const mockPlayers = [
      { id: 'p1', name: 'Player 1' },
      { id: 'p2', name: 'Player 2' }
    ];

    vi.mocked(api.getGames).mockResolvedValue(mockGames as any);
    vi.mocked(api.getPlayers).mockResolvedValue(mockPlayers as any);

    render(
      <MemoryRouter initialEntries={['/history']}>
        <App />
      </MemoryRouter>
    );

    // Should see history title
    expect(screen.getByText('Arena History')).toBeInTheDocument();

    // Click on a game (assuming GameHistory renders something we can click)
    // Looking at GameHistory.tsx, it renders a table or list
    const selectButton = await screen.findByText('VIEW');
    fireEvent.click(selectButton);

    // Should navigate to Arena
    expect(screen.getAllByText('ARENA')[0]).toBeInTheDocument();
  });

  it('should render the Profiles page when clicking the sidebar link', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    const profilesLink = screen.getByText('PROFILES').closest('a');
    if (!profilesLink) throw new Error('Profiles link not found');
    
    fireEvent.click(profilesLink);

    expect(screen.getByText('LLM Profiles')).toBeInTheDocument();
  });
});
