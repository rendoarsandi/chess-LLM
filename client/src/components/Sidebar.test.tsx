import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Sidebar } from './Sidebar'
import { MemoryRouter } from 'react-router'
import { authClient } from '@/lib/auth-client'

// Mock authClient
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn(),
  },
}))

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders basic nav items', () => {
    ;(authClient.useSession as any).mockReturnValue({ data: null })
    
    render(
      <MemoryRouter>
        <Sidebar isCollapsed={false} setIsCollapsed={vi.fn()} />
      </MemoryRouter>
    )
    
    expect(screen.getByText('ARENA')).toBeDefined()
    expect(screen.getByText('LEADERBOARD')).toBeDefined()
    expect(screen.queryByText('SETTINGS')).toBeNull()
  })

  it('renders settings and logout when logged in', () => {
    ;(authClient.useSession as any).mockReturnValue({ data: { user: { id: '1' } } })
    
    render(
      <MemoryRouter>
        <Sidebar isCollapsed={false} setIsCollapsed={vi.fn()} />
      </MemoryRouter>
    )
    
    expect(screen.getByText('SETTINGS')).toBeDefined()
    expect(screen.getByText('LOGOUT')).toBeDefined()
  })

  it('calls signOut when logout is clicked', async () => {
    ;(authClient.useSession as any).mockReturnValue({ data: { user: { id: '1' } } })
    ;(authClient.signOut as any).mockResolvedValue({})

    render(
      <MemoryRouter>
        <Sidebar isCollapsed={false} setIsCollapsed={vi.fn()} />
      </MemoryRouter>
    )
    
    fireEvent.click(screen.getByText('LOGOUT'))
    
    expect(authClient.signOut).toHaveBeenCalled()
  })
})