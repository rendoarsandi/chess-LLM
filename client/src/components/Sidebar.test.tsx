import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { MemoryRouter } from 'react-router'

describe('Sidebar Component', () => {
  it('toggles collapse state when the toggle button is clicked', () => {
    const setView = vi.fn()
    const setIsCollapsed = vi.fn()
    
    const { rerender } = render(
      <MemoryRouter>
        <Sidebar view="arena" setView={setView} isCollapsed={false} setIsCollapsed={setIsCollapsed} />
      </MemoryRouter>
    )

    // Check if expanded (should see labels)
    expect(screen.getByText('ARENA')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toHaveClass('w-64')

    const toggleButton = screen.getByLabelText('Toggle Sidebar')
    fireEvent.click(toggleButton)

    // Verify setIsCollapsed was called with true
    expect(setIsCollapsed).toHaveBeenCalledWith(true)

    // Rerender as collapsed
    rerender(
      <MemoryRouter>
        <Sidebar view="arena" setView={setView} isCollapsed={true} setIsCollapsed={setIsCollapsed} />
      </MemoryRouter>
    )

    expect(screen.getByRole('navigation')).toHaveClass('w-16')
    // Label should be hidden or inside a tooltip-like span (which might still be in DOM but invisible)
    // In our implementation, label is only rendered if !isCollapsed
    expect(screen.queryByText('ARENA', { selector: 'span:not(.absolute)' })).not.toBeInTheDocument()
  })

  it('contains links to the correct routes', () => {
    const setView = vi.fn()
    const setIsCollapsed = vi.fn()
    
    render(
      <MemoryRouter>
        <Sidebar view="arena" setView={setView} isCollapsed={false} setIsCollapsed={setIsCollapsed} />
      </MemoryRouter>
    )

    const arenaLink = screen.getByText('ARENA').closest('a')
    const leaderboardLink = screen.getByText('LEADERBOARD').closest('a')
    
    expect(arenaLink).toHaveAttribute('href', '/')
    expect(leaderboardLink).toHaveAttribute('href', '/leaderboard')
  })
})
