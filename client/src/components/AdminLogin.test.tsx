import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminLogin } from './AdminLogin'
import { MemoryRouter } from 'react-router'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'

// Mock authClient
vi.mock('@/lib/auth-client', () => ({
    authClient: {
        signIn: {
            email: vi.fn()
        }
    }
}))

// Mock sonner
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}))

const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router')
    return {
        ...actual,
        useNavigate: () => mockNavigate
    }
})

describe('AdminLogin Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the login form', () => {
        render(
            <MemoryRouter>
                <AdminLogin />
            </MemoryRouter>
        )

        expect(screen.getByText('Admin Access')).toBeInTheDocument()
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /LOGIN TO DASHBOARD/i })).toBeInTheDocument()
    })

    it('handles successful login', async () => {
        const mockSignIn = vi.mocked(authClient.signIn.email).mockResolvedValue({
            data: { session: {} },
            error: null
        } as any)

        render(
            <MemoryRouter>
                <AdminLogin />
            </MemoryRouter>
        )

        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'admin@test.com' } })
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } })
        fireEvent.click(screen.getByRole('button', { name: /LOGIN TO DASHBOARD/i }))

        await waitFor(() => {
            expect(mockSignIn).toHaveBeenCalledWith({
                email: 'admin@test.com',
                password: 'password123'
            })
            expect(toast.success).toHaveBeenCalledWith('Welcome, Admin')
            expect(mockNavigate).toHaveBeenCalledWith('/admin/settings')
        })
    })

    it('handles login failure', async () => {
        vi.mocked(authClient.signIn.email).mockResolvedValue({
            data: null,
            error: { message: 'Invalid credentials' }
        } as any)

        render(
            <MemoryRouter>
                <AdminLogin />
            </MemoryRouter>
        )

        fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'admin@test.com' } })
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong' } })
        fireEvent.click(screen.getByRole('button', { name: /LOGIN TO DASHBOARD/i }))

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Invalid credentials')
            expect(mockNavigate).not.toHaveBeenCalled()
        })
    })
})
