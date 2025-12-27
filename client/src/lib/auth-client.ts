import { createAuthClient } from "better-auth/react"

const realAuthClient = createAuthClient({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001"
})

// Mock authClient for Dev Mode
export const authClient = {
    ...realAuthClient,
    useSession: () => ({
        data: {
            user: {
                id: "dev-admin-id",
                email: "admin@example.com",
                name: "Dev Admin",
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            session: {
                id: "dev-session-id",
                userId: "dev-admin-id",
                token: "dev-token",
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        },
        isPending: false,
        error: null,
        refetch: async () => {}
    }),
    signIn: {
        email: async () => ({ 
            data: {
                user: { id: "dev-admin-id", email: "admin@example.com", name: "Dev Admin" },
                session: { id: "dev-session-id" }
            }, 
            error: null 
        })
    },
    signOut: async () => ({ success: true })
} as any;
