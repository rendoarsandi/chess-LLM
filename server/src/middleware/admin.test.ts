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
        vi.mocked(auth.api.getSession).mockResolvedValue(null)

        const res = await app.request('/admin/test')
        expect(res.status).toBe(401)
        expect(await res.json()).toEqual({ error: 'Unauthorized' })
    })

    it('should return 403 if user is not admin', async () => {
        vi.mocked(auth.api.getSession).mockResolvedValue({
            user: { email: 'user@example.com' },
            session: {}
        } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>)

        const res = await app.request('/admin/test')
        expect(res.status).toBe(403)
        expect(await res.json()).toEqual({ error: 'Forbidden: Admin access only' })
    })

    it('should call next() if user is admin', async () => {
        vi.mocked(auth.api.getSession).mockResolvedValue({
            user: { email: 'admin@example.com' },
            session: {}
        } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>)

        const res = await app.request('/admin/test')
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ success: true })
    })

    it('should return 403 if ADMIN_EMAIL is not set', async () => {
        delete process.env.ADMIN_EMAIL
        vi.mocked(auth.api.getSession).mockResolvedValue({
            user: { email: 'admin@example.com' },
            session: {}
        } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>)

        const res = await app.request('/admin/test')
        expect(res.status).toBe(403)
    })
})
