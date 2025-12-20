import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar, type View } from './Sidebar'

describe('Sidebar Component', () => {
  it('toggles collapse state when the toggle button is clicked', () => {
    const setView = vi.fn()
    const setIsCollapsed = vi.fn()
    
    const { rerender } = render(
      <Sidebar view="arena" setView={setView} isCollapsed={false} setIsCollapsed={setIsCollapsed} />
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
      <Sidebar view="arena" setView={setView} isCollapsed={true} setIsCollapsed={setIsCollapsed} />
    )

    expect(screen.getByRole('navigation')).toHaveClass('w-16')
    // Label should be hidden or inside a tooltip-like span (which might still be in DOM but invisible)
    // In our implementation, label is only rendered if !isCollapsed
    expect(screen.queryByText('ARENA', { selector: 'span:not(.absolute)' })).not.toBeInTheDocument()
  })

  it('calls setView when a nav item is clicked', () => {
    const setView = vi.fn()
    const setIsCollapsed = vi.fn()
    
    render(
      <Sidebar view="arena" setView={setView} isCollapsed={false} setIsCollapsed={setIsCollapsed} />
    )

    const leaderboardButton = screen.getByText('LEADERBOARD').closest('button')
    if (!leaderboardButton) throw new Error('Button not found')
    
    fireEvent.click(leaderboardButton)
    expect(setView).toHaveBeenCalledWith('leaderboard')
  })
})
