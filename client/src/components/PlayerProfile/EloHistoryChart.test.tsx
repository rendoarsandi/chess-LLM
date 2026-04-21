/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { EloHistoryChart } from './EloHistoryChart'

// Mock api
vi.mock('@/api', () => ({
  getEloHistory: vi.fn(() =>
    Promise.resolve([
      { rating: 1200, createdAt: new Date().toISOString() },
      { rating: 1250, createdAt: new Date().toISOString() },
    ]),
  ),
}))

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)

describe('EloHistoryChart', () => {
  async function renderChart() {
    render(<EloHistoryChart playerId="p1" />)
    await waitFor(() =>
      expect(screen.queryByText(/Insufficient data for this period/i)).not.toBeInTheDocument(),
    )
  }

  it('renders rating progression title', async () => {
    await renderChart()
    expect(screen.getByText(/Rating Progression/i)).toBeDefined()
  })

  it('renders period buttons', async () => {
    await renderChart()
    expect(screen.getByText('7D')).toBeDefined()
    expect(screen.getByText('30D')).toBeDefined()
    expect(screen.getByText('90D')).toBeDefined()
    expect(screen.getByText('ALL')).toBeDefined()
  })
})
