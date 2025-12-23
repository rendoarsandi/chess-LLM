import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { TournamentList } from "./TournamentList"
import * as api from "../api"
import { BrowserRouter } from "react-router"

vi.mock("../api", () => ({
  getTournaments: vi.fn(),
}))

const mockTournaments: api.Tournament[] = [
  {
    id: "1",
    name: "Winter Championship",
    startTime: new Date().toISOString(),
    status: "active",
    currentRound: 2,
    totalRounds: 5,
    createdAt: new Date().toISOString(),
    timeControlSettings: JSON.stringify({ increment: 5, initialMinutes: 10 }),
  },
  {
    id: "2",
    name: "Spring Open",
    startTime: new Date(Date.now() + 86400000).toISOString(),
    status: "scheduled",
    currentRound: 0,
    totalRounds: 3,
    createdAt: new Date().toISOString(),
    timeControlSettings: JSON.stringify({ increment: 2, initialMinutes: 3 }),
  },
  {
    id: "3",
    name: "Summer Cup 2024",
    startTime: new Date(Date.now() - 86400000).toISOString(),
    status: "completed",
    currentRound: 5,
    totalRounds: 5,
    createdAt: new Date().toISOString(),
    timeControlSettings: JSON.stringify({ increment: 10, initialMinutes: 30 }),
  },
]

describe("TournamentList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the tournament sections when data is fetched", async () => {
    vi.mocked(api.getTournaments).mockResolvedValue(mockTournaments)

    render(
      <BrowserRouter>
        <TournamentList />
      </BrowserRouter>
    )

    expect(screen.getByText(/CHAMPIONSHIPS/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("Winter Championship")).toBeInTheDocument()
      expect(screen.getByText("Spring Open")).toBeInTheDocument()
      expect(screen.getByText("Summer Cup 2024")).toBeInTheDocument()
    })

    expect(screen.getByText(/LIVE NOW/i)).toBeInTheDocument()
    expect(screen.getByText(/UPCOMING/i)).toBeInTheDocument()
    expect(screen.getByText(/HALL OF FAME/i)).toBeInTheDocument()
  })

  it("shows empty state when no tournaments are found", async () => {
    vi.mocked(api.getTournaments).mockResolvedValue([])

    render(
      <BrowserRouter>
        <TournamentList />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/NO TOURNAMENTS SCHEDULED AT THIS TIME/i)).toBeInTheDocument()
    })
  })

  it("periodically refreshes data", async () => {
    vi.useFakeTimers()
    vi.mocked(api.getTournaments).mockResolvedValue([])

    render(
      <BrowserRouter>
        <TournamentList />
      </BrowserRouter>
    )

    // Initial fetch
    await vi.waitFor(() => {
      expect(api.getTournaments).toHaveBeenCalledTimes(1)
    })

    // Advance timers
    vi.advanceTimersByTime(5000)

    // Second fetch should have been triggered
    await vi.waitFor(() => {
      expect(api.getTournaments).toHaveBeenCalledTimes(2)
    })
    
    vi.useRealTimers()
  })
})
