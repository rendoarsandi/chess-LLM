import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
