import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from './index'
import { auth } from './lib/auth'
import { db } from './db'
import { llmConfigurations } from './db/schema'

vi.mock('./lib/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn()
        },
        handler: vi.fn()
    }
}))

describe('Admin API Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.ADMIN_EMAIL = 'admin@example.com'
        // Mock authorized session
        vi.mocked(auth.api.getSession).mockResolvedValue({
            user: { email: 'admin@example.com' },
            session: {}
        } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>)
    })

    it('GET /api/admin/models should return all configurations', async () => {
        const res = await app.request('/api/admin/models')
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(Array.isArray(data)).toBe(true)
    })

    it('POST /api/admin/models should create a new configuration', async () => {
        const payload = {
            provider: 'gemini',
            modelId: 'gemini-test',
            apiKey: 'test-key',
            isActive: true,
            isHardcoded: false
        }

        const res = await app.request('/api/admin/models', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        })

        expect(res.status).toBe(201)
        const data = await res.json()
        expect(data.modelId).toBe('gemini-test')
        expect(data.id).toBeDefined()
    })

    it('PATCH /api/admin/models/:id should update a configuration', async () => {
        // Create one first
        const [config] = await db.insert(llmConfigurations).values({
            provider: 'groq',
            modelId: 'groq-test',
            isActive: true
        }).returning()

        const res = await app.request(`/api/admin/models/${config.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive: false }),
            headers: { 'Content-Type': 'application/json' }
        })

        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.isActive).toBe(false)
    })

    it('DELETE /api/admin/models/:id should delete a configuration', async () => {
        const [config] = await db.insert(llmConfigurations).values({
            provider: 'to-delete',
            modelId: 'delete-me'
        }).returning()

        const res = await app.request(`/api/admin/models/${config.id}`, {
            method: 'DELETE'
        })

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ success: true })
    })

    it('should return 403 if unauthorized user attempts to access admin routes', async () => {
        vi.mocked(auth.api.getSession).mockResolvedValue({
            user: { email: 'not-admin@example.com' },
            session: {}
        } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>)

        const res = await app.request('/api/admin/models')
        expect(res.status).toBe(403)
    })
})
