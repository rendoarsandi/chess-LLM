import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from './App';

// Mock the API calls to avoid network errors during tests
import * as api from './api';
import { vi } from 'vitest';
import { authClient } from '@/lib/auth-client';

// Mock authClient
vi.mock('@/lib/auth-client', () => ({
  authClient: {
      signIn: {
          email: vi.fn()
      },
      useSession: vi.fn()
  }
}))

vi.mock('./api', () => ({
  getGames: vi.fn().mockResolvedValue([]),
  getGame: vi.fn().mockResolvedValue(null),
  getMoves: vi.fn().mockResolvedValue([]),
  getPlayers: vi.fn().mockResolvedValue([]),
  getLeaderboard: vi.fn().mockResolvedValue([]),
  getPlayerProfile: vi.fn().mockResolvedValue(null),
  getEloHistory: vi.fn().mockResolvedValue([]),
  getHeadToHead: vi.fn().mockResolvedValue([]),
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

    vi.mocked(api.getGames).mockResolvedValue(mockGames as unknown as api.Game[]);
    vi.mocked(api.getPlayers).mockResolvedValue(mockPlayers as unknown as api.Player[]);

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

    expect(screen.getAllByText('PROFILES').length).toBeGreaterThanOrEqual(2);
  });

  it('should render a specific player profile when navigating to /profiles/:id', async () => {
    const mockPlayer = { id: 'p1', name: 'Deep Blue', type: 'llm', rating: 2800, wins: 10, losses: 5, draws: 2, peakRating: 2800, createdAt: '' };
    vi.mocked(api.getPlayers).mockResolvedValue([mockPlayer] as unknown as api.Player[]);
    vi.mocked(api.getPlayerProfile).mockResolvedValue(mockPlayer as unknown as api.Player);

    render(
      <MemoryRouter initialEntries={['/profiles/p1']}>
        <App />
      </MemoryRouter>
    );

    // Should find the player name in the profile header
    const profileHeader = await screen.findByText('Deep Blue');
    expect(profileHeader).toBeInTheDocument();
  });

  it('should preserve selected game when navigating between pages', async () => {
    const mockGame = { id: 'game-persist', whitePlayerId: 'p1', blackPlayerId: 'p2', status: 'ongoing' };
    const mockPlayers = [
      { id: 'p1', name: 'Player 1', type: 'llm' },
      { id: 'p2', name: 'Player 2', type: 'llm' }
    ];
    vi.mocked(api.getGames).mockResolvedValue([mockGame] as unknown as api.Game[]);
    vi.mocked(api.getGame).mockResolvedValue(mockGame as unknown as api.Game);
    vi.mocked(api.getPlayers).mockResolvedValue(mockPlayers as unknown as api.Player[]);

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    // Initial redirect to /arena, then auto-select first game
    await screen.findAllByText('ARENA');

    // Should show white player name (ThinkingPanel or ArenaContent)
    const whitePlayerDisplay = await screen.findAllByText('Player 1');
    expect(whitePlayerDisplay.length).toBeGreaterThan(0);

    // Navigate away
    const leaderboardLink = screen.getByText('LEADERBOARD').closest('a');
    fireEvent.click(leaderboardLink!);
    expect(screen.getByText('Model Rankings')).toBeInTheDocument();

    // Navigate back
    const arenaLink = screen.getAllByText('ARENA')[0].closest('a');
    fireEvent.click(arenaLink!);

    // Game should still be there
    await waitFor(() => {
      expect(screen.getAllByText('Player 1').length).toBeGreaterThan(0);
    });
  });

  it('should render a specific game when navigating to /arena/:id', async () => {
    const mockGame = { id: 'specific-game-id', whitePlayerId: 'p1', blackPlayerId: 'p2', status: 'ongoing' };
    vi.mocked(api.getGames).mockResolvedValue([mockGame] as unknown as api.Game[]);
    vi.mocked(api.getGame).mockResolvedValue(mockGame as unknown as api.Game);

    render(
      <MemoryRouter initialEntries={['/arena/specific-game-id']}>
        <App />
      </MemoryRouter>
    );

    const gameIdDisplay = await screen.findByText('specific');
    expect(gameIdDisplay).toBeInTheDocument();
  });

  it('should render AdminLogin when navigating to /login', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Access')).toBeInTheDocument();
  });

  it('should render AdminSettings when authenticated and navigating to /admin/settings', async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { email: 'admin@test.com' } },
      isPending: false,
      error: null
    } as any)

    render(
      <MemoryRouter initialEntries={['/admin/settings']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Settings')).toBeInTheDocument();
  });

  it('should redirect to /login when navigating to /admin/settings without session', async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: false,
      error: null
    } as any)

    render(
      <MemoryRouter initialEntries={['/admin/settings']}>
        <App />
      </MemoryRouter>
    );

    // Should redirect to login
    expect(screen.getByText('Admin Access')).toBeInTheDocument();
  });
});
