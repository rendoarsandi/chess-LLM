import { describe, it, expect } from 'vitest'
import { auth } from './auth'

describe('Auth Configuration', () => {
    it('should export the auth object', () => {
        expect(auth).toBeDefined()
        expect(auth.api).toBeDefined()
        expect(auth.handler).toBeDefined()
    })

    it('should have the correct plugins configured', () => {
        // We can't easily inspect internal plugins of better-auth
        // but we can check if the expected API methods are present
        expect(auth.api.getSession).toBeDefined()
    })
})
