import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProtectedRoute } from './ProtectedRoute'
import { MemoryRouter, Routes, Route } from 'react-router'
import { authClient } from '@/lib/auth-client'

// Mock authClient
vi.mock('@/lib/auth-client', () => ({
    authClient: {
        useSession: vi.fn()
    }
}))

describe('ProtectedRoute Component', () => {
    it('shows loading state when session is pending', () => {
        vi.mocked(authClient.useSession).mockReturnValue({
            data: null,
            isPending: true,
            error: null
        } as unknown as ReturnType<typeof authClient.useSession>)

        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        )

        expect(screen.getByText(/Verifying Session.../i)).toBeInTheDocument()
    })

    it('redirects to login when no session exists', () => {
        vi.mocked(authClient.useSession).mockReturnValue({
            data: null,
            isPending: false,
            error: null
        } as unknown as ReturnType<typeof authClient.useSession>)

        render(
            <MemoryRouter initialEntries={['/admin/settings']}>
                <Routes>
                    <Route path="/admin/settings" element={
                        <ProtectedRoute>
                            <div>Protected Content</div>
                        </ProtectedRoute>
                    } />
                    <Route path="/login" element={<div>Login Page</div>} />
                </Routes>
            </MemoryRouter>
        )

        expect(screen.getByText('Login Page')).toBeInTheDocument()
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('renders children when session exists', () => {
        vi.mocked(authClient.useSession).mockReturnValue({
            data: { user: { email: 'admin@test.com' } },
            isPending: false,
            error: null
        } as unknown as ReturnType<typeof authClient.useSession>)

        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        )

        expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
})
