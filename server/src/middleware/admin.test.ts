import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { adminMiddleware } from './admin'
import { auth } from '../lib/auth'

vi.mock('../lib/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn()
        }
    }
}))

describe('Admin Middleware', () => {
    let app: Hono

    beforeEach(() => {
        app = new Hono()
        app.use('/admin/*', adminMiddleware)
        app.get('/admin/test', (c) => c.json({ success: true }))
        vi.clearAllMocks()
        process.env.ADMIN_EMAIL = 'admin@example.com'
    })

    it('should return 401 if no session exists', async () => {
        ;(auth.api.getSession as any).mockResolvedValue(null)

        const res = await app.request('/admin/test')
        expect(res.status).toBe(401)
        expect(await res.json()).toEqual({ error: 'Unauthorized' })
    })

    it('should return 403 if user is not admin', async () => {
        ;(auth.api.getSession as any).mockResolvedValue({
            user: { email: 'user@example.com' },
            session: {}
        })

        const res = await app.request('/admin/test')
        expect(res.status).toBe(403)
        expect(await res.json()).toEqual({ error: 'Forbidden: Admin access only' })
    })

    it('should call next() if user is admin', async () => {
        ;(auth.api.getSession as any).mockResolvedValue({
            user: { email: 'admin@example.com' },
            session: {}
        })

        const res = await app.request('/admin/test')
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ success: true })
    })

    it('should return 403 if ADMIN_EMAIL is not set', async () => {
        delete process.env.ADMIN_EMAIL
        ;(auth.api.getSession as any).mockResolvedValue({
            user: { email: 'admin@example.com' },
            session: {}
        })

        const res = await app.request('/admin/test')
        expect(res.status).toBe(403)
    })
})
