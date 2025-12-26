import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import App from "./App"
import * as api from "./api"
import { MemoryRouter } from "react-router"
import type { Player, Game, Move } from "./api"

// Mock the API module
vi.mock("./api", () => ({
  getGames: vi.fn(),
  getGame: vi.fn(),
  createGame: vi.fn(),
  deleteGame: vi.fn(),
  getMoves: vi.fn(),
  getPlayers: vi.fn(),
  getLeaderboard: vi.fn(),
  pauseGame: vi.fn(),
  resumeGame: vi.fn(),
  getPlayerProfile: vi.fn(),
  clearHistory: vi.fn(),
  getTournaments: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("App Integration", () => {
  const mockPlayers: Player[] = [
    { 
      id: '1', name: 'Gemini 1.5 Pro', type: 'llm', rating: 1500, rating960: 1500, 
      wins: 10, losses: 5, draws: 2, peakRating: 1550, peakRating960: 1550, createdAt: new Date().toISOString() 
    },
    { 
      id: '2', name: 'Groq Llama 3', type: 'llm', rating: 1450, rating960: 1450, 
      wins: 8, losses: 7, draws: 3, peakRating: 1480, peakRating960: 1480, createdAt: new Date().toISOString() 
    },
  ]

  const mockGame: Game = {
    id: 'game-123',
    whitePlayerId: '1',
    blackPlayerId: '2',
    status: 'ongoing',
    variant: 'standard',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    winnerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const mockMove: Move = {
    id: 1,
    gameId: 'game-123',
    moveNumber: 1,
    playerColor: 'white',
    move: 'e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    createdAt: new Date().toISOString()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getPlayers).mockResolvedValue(mockPlayers)
    vi.mocked(api.getLeaderboard).mockResolvedValue(mockPlayers)
    vi.mocked(api.getGames).mockResolvedValue([mockGame])
    vi.mocked(api.getGame).mockResolvedValue(mockGame)
    vi.mocked(api.getMoves).mockResolvedValue([])
    vi.mocked(api.getTournaments).mockResolvedValue([])
  })

  it("renders the sidebar and arena content", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText(/LEADERBOARD/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/ARENA/i).length).toBeGreaterThan(0)
    })
  })

  it("can select and view a game", async () => {
    vi.mocked(api.getMoves).mockResolvedValue([mockMove])

    render(
      <MemoryRouter initialEntries={["/arena/game-123"]}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Match:/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Gemini 1.5 Pro/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Groq Llama 3/i).length).toBeGreaterThan(0)
    })
  })

  it("can select and view a Chess 960 game", async () => {
    const mockGame960: Game = {
      ...mockGame,
      variant: 'chess960',
      startPosId: 518,
      fen: 'qrbnkrbn/pppppppp/8/8/8/8/PPPPPPPP/QRBNKRBN w KQkq - 0 1'
    }
    vi.mocked(api.getGame).mockResolvedValue(mockGame960)

    render(
      <MemoryRouter initialEntries={["/arena/game-123"]}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/SP-ID: 518/i)).toBeInTheDocument()
    })
  })

  it("shows an error when an illegal move is detected", async () => {
    const invalidMoves: Move[] = [
      {
        ...mockMove,
        move: 'e5', // Illegal for white's first move from standard start
      }
    ]
    
    vi.mocked(api.getMoves).mockResolvedValue(invalidMoves)
    vi.mocked(api.getGame).mockResolvedValue({
      ...mockGame,
      status: 'completed',
      winnerId: '2',
      gameOverReason: 'illegal move detected'
    })

    render(
      <MemoryRouter initialEntries={["/arena/game-123"]}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      // The text is likely in the reason field, which might be prefixed with "By "
      expect(screen.getAllByText(/illegal move detected/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Game Over/i)).toBeInTheDocument()
    })
  })

  it("allows navigating to the leaderboard", async () => {
    render(
      <MemoryRouter initialEntries={["/arena"]}>
        <App />
      </MemoryRouter>
    )

    const leaderboardLink = screen.getByText(/LEADERBOARD/i)
    fireEvent.click(leaderboardLink)

    await waitFor(() => {
      expect(screen.getByText(/Model Rankings/i)).toBeInTheDocument()
    })
  })
})