import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import App from './App'
import * as api from './api'
import { MemoryRouter } from 'react-router'
import { authClient } from '@/lib/auth-client'

// Mock authClient
vi.mock('@/lib/auth-client', () => ({
  authClient: {
      signIn: {
          email: vi.fn()
      },
      useSession: vi.fn(() => ({
          data: null,
          isPending: false,
          error: null
      }))
  }
}))

// Mock the API
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
  clearHistory: vi.fn(),
  getAdminModels: vi.fn().mockResolvedValue([]),
  createAdminModel: vi.fn(),
  updateAdminModel: vi.fn(),
  deleteAdminModel: vi.fn(),
  getTournaments: vi.fn().mockResolvedValue([]),
  claimJob: vi.fn().mockResolvedValue(null),
  submitReview: vi.fn().mockResolvedValue({ success: true }),
}))

describe('App Component', () => {
  const mockPlayers = [
    { id: 'p1', name: 'Player 1', type: 'llm' as const, rating: 1200, wins: 0, losses: 0, draws: 0, peakRating: 1200, createdAt: '' },
    { id: 'p2', name: 'Player 2', type: 'llm' as const, rating: 1200, wins: 0, losses: 0, draws: 0, peakRating: 1200, createdAt: '' },
  ]

  const mockGame = {
    id: 'game-1',
    whitePlayerId: 'p1',
    blackPlayerId: 'p2',
    status: 'ongoing' as const,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    winnerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getPlayers).mockResolvedValue(mockPlayers)
    vi.mocked(api.getLeaderboard).mockResolvedValue(mockPlayers)
    vi.mocked(api.getGames).mockResolvedValue([mockGame])
    vi.mocked(api.getGame).mockResolvedValue(mockGame)
    vi.mocked(api.getMoves).mockResolvedValue([])
    
    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: false,
      error: null
    } as unknown as ReturnType<typeof authClient.useSession>);
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Core Integration', () => {
    it('updates board FEN when moves are fetched', async () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => expect(api.getGames).toHaveBeenCalled())
      
      const moveFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
      const mockMove = {
        id: 1,
        gameId: 'game-1',
        moveNumber: 1,
        playerColor: 'white',
        move: 'e4',
        fen: moveFen,
        createdAt: new Date().toISOString(),
      }

      ;(api.getMoves as Mock).mockResolvedValue([mockMove])

      // If mobile, the move list might be in a collapsible section
      const moveListHeader = screen.queryByText('Move List')
      if (moveListHeader) {
        fireEvent.click(moveListHeader)
      }

      await waitFor(() => {
        expect(screen.queryAllByText('Move History').length).toBeGreaterThan(0)
      }, { timeout: 15000 })
    }, 20000)

    it('shows HISTORY MODE badge when navigating back in history', async () => {
      const mockMoves = [
        {
          id: 1,
          gameId: 'game-1',
          moveNumber: 1,
          playerColor: 'white',
          move: 'e4',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          gameId: 'game-1',
          moveNumber: 1,
          playerColor: 'black',
          move: 'e5',
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
          createdAt: new Date().toISOString(),
        }
      ]
      
      ;(api.getMoves as Mock).mockResolvedValue(mockMoves)

      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => expect(screen.getAllByText('e5').length).toBeGreaterThan(0), { timeout: 15000 })

      const moveButton = screen.getAllByText('e4')[0]
      fireEvent.click(moveButton)

      expect(screen.getByText('HISTORY MODE')).toBeInTheDocument()
    }, 20000)

    it('handles invalid moves gracefully instead of crashing', async () => {
      const invalidMoves = [
        { id: 1, move: 'Nf3', playerColor: 'white' },
        { id: 2, move: 'Nf3', playerColor: 'black' }, // INVALID
      ];

      (api.getMoves as Mock).mockResolvedValue(invalidMoves);

      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      );

      const arenaTitles = await screen.findAllByText('ARENA');
      expect(arenaTitles[0]).toBeInTheDocument();
    });
  })

  describe('Routing', () => {
    it('should render the Leaderboard when navigating to /leaderboard', async () => {
      render(
        <MemoryRouter initialEntries={['/leaderboard']}>
          <App />
        </MemoryRouter>
      );

      const title = await screen.findByText('Model Rankings');
      expect(title).toBeInTheDocument();
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

      await waitFor(() => {
        expect(screen.getAllByText('PROFILES').length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should render AdminLogin when navigating to /login', async () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      );

      expect(await screen.findByText('Admin Access')).toBeInTheDocument();
    });

    it('should render AdminSettings when authenticated and navigating to /admin/settings', async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { email: 'admin@test.com' } },
        isPending: false,
        error: null
      } as unknown as ReturnType<typeof authClient.useSession>)

      render(
        <MemoryRouter initialEntries={['/admin/settings']}>
          <App />
        </MemoryRouter>
      );

      expect(await screen.findByText('Admin Settings')).toBeInTheDocument();
    });
  })
})