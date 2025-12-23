import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Context } from 'hono'
import { workerMiddleware } from './worker'
import { auth } from '../lib/auth'

vi.mock('../lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

describe('workerMiddleware', () => {
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
    })

    await workerMiddleware(mockContext as unknown as Context, next)

    expect(nextCalled).toBe(true)
  })

  it('denies access with an invalid worker token and no session', async () => {
    process.env.WORKER_TOKEN = 'secret-token'
    mockContext.req.header.mockReturnValue('Bearer wrong-token')
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    const result = (await workerMiddleware(mockContext as unknown as Context, next)) as unknown as { data: { error: string }, status: number }

    expect(nextCalled).toBe(false)
    expect(result.status).toBe(401)
    expect(result.data.error).toBe("Unauthorized: Invalid credentials")
  })

  it('denies access if admin email does not match session', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com'
    mockContext.req.header.mockReturnValue(undefined)
    
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { 
        email: 'wrong@example.com', 
        id: '2', 
        name: 'User', 
        emailVerified: true, 
        createdAt: new Date(), 
        updatedAt: new Date(),
        banned: false
      },
      session: { 
        id: 's2', 
        userId: '2', 
        expiresAt: new Date(), 
        createdAt: new Date(), 
        updatedAt: new Date(), 
        userAgent: '', 
        ipAddress: '',
        token: 'session-token-2'
      }
    })

    const result = (await workerMiddleware(mockContext as unknown as Context, next)) as unknown as { status: number }

    expect(nextCalled).toBe(false)
    expect(result.status).toBe(401)
  })
})
