import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono, Context } from 'hono'
import { adminMiddleware } from './admin'
import { workerMiddleware } from './worker'
import { auth } from '../lib/auth'

vi.mock('../lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

describe('Middlewares', () => {
  describe('Admin Middleware', () => {
    let app: Hono

    beforeEach(() => {
      app = new Hono()
      app.use('/admin/*', adminMiddleware)
      app.get('/admin/test', (c) => c.json({ success: true }))
      vi.clearAllMocks()
      process.env.ADMIN_EMAIL = 'admin@example.com'
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
  })

  describe('Worker Middleware', () => {
    let mockContext: {
      req: {
        header: ReturnType<typeof vi.fn>;
        raw: { headers: Headers };
      };
      json: ReturnType<typeof vi.fn>;
    }
    let nextCalled: boolean

    beforeEach(() => {
      vi.clearAllMocks()
      nextCalled = false
      mockContext = {
        req: {
          header: vi.fn(),
          raw: {
            headers: new Headers(),
          },
        },
        json: vi.fn().mockImplementation((data, status) => ({ data, status })),
      }
    })

    const next = async () => {
      nextCalled = true
    }

    it('allows access with a valid worker token', async () => {
      process.env.WORKER_TOKEN = 'secret-token'
      mockContext.req.header.mockReturnValue('Bearer secret-token')

      await workerMiddleware(mockContext as unknown as Context, next)

      expect(nextCalled).toBe(true)
    })

    it('allows access with a valid admin session', async () => {
      process.env.ADMIN_EMAIL = 'admin@example.com'
      process.env.WORKER_TOKEN = 'secret-token'
      mockContext.req.header.mockReturnValue('Invalid')
      
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { 
          email: 'admin@example.com', 
          id: '1', 
          name: 'Admin', 
          emailVerified: true, 
          createdAt: new Date(), 
          updatedAt: new Date(),
          banned: false
        },
        session: { 
          id: 's1', 
          userId: '1', 
          expiresAt: new Date(), 
          createdAt: new Date(), 
          updatedAt: new Date(), 
          userAgent: '', 
          ipAddress: '',
          token: 'session-token'
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      await workerMiddleware(mockContext as unknown as Context, next)

      expect(nextCalled).toBe(true)
    })
  })
})
