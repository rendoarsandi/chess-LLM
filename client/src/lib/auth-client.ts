import { createAuthClient } from 'better-auth/react'

const realAuthClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
})

// Mock authClient for Dev Mode
export const authClient = {
  ...realAuthClient,
  useSession: () => ({
    data: {
      user: {
        id: 'dev-admin-id',
        email: 'admin@example.com',
        name: 'Dev Admin',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        id: 'dev-session-id',
        userId: 'dev-admin-id',
        token: 'dev-token',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    isPending: false,
    isRefetching: false,
    error: null,
    refetch: async () => {},
  }),
  signIn: {
    ...realAuthClient.signIn,
    email: async () => ({
      data: {
        redirect: false,
        token: 'dev-token',
        user: {
          id: 'dev-admin-id',
          email: 'admin@example.com',
          name: 'Dev Admin',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      error: null,
    }),
  },
  signOut: async () => ({ success: true }),
} as unknown as typeof realAuthClient
