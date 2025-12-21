import { describe, it, expect } from 'vitest'
import { authClient } from './auth-client'

describe('Auth Client', () => {
    it('should be initialized', () => {
        expect(authClient).toBeDefined()
        expect(authClient.signIn).toBeDefined()
        expect(authClient.signOut).toBeDefined()
        expect(authClient.useSession).toBeDefined()
    })
})
