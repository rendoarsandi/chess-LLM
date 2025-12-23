import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminSettings } from './AdminSettings'
import * as api from '../api'

// Mock the API module
vi.mock('../api', () => ({
  getAdminModels: vi.fn(),
  createAdminModel: vi.fn(),
  updateAdminModel: vi.fn(),
  deleteAdminModel: vi.fn(),
}))

describe('AdminSettings', () => {
  const mockConfigs: api.LLMConfig[] = [
    {
      id: 1,
      provider: 'gemini',
      modelId: 'gemini-1.5-pro',
      apiKey: 'sk-123',
      isActive: true,
      isHardcoded: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      provider: 'groq',
      modelId: 'llama-3',
      apiKey: null,
      isActive: false,
      isHardcoded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getAdminModels).mockResolvedValue(mockConfigs)
  })

  it('renders model list correctly', async () => {
    render(<AdminSettings />)
    
    expect(screen.getByText(/Admin Settings/i)).toBeDefined()
    
    await waitFor(() => {
      expect(screen.getByText('gemini-1.5-pro')).toBeDefined()
      expect(screen.getByText('llama-3')).toBeDefined()
    })
  })

  it('allows adding a new model', async () => {
    vi.mocked(api.createAdminModel).mockResolvedValue({
        id: 3,
        provider: 'gemini',
        modelId: 'gemini-new',
        apiKey: 'key-new',
        isActive: true,
        isHardcoded: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    })

    render(<AdminSettings />)
    
    fireEvent.click(screen.getByText(/Add New Model/i))
    
    fireEvent.change(screen.getByLabelText(/Provider/i), { target: { value: 'gemini' } })
    fireEvent.change(screen.getByLabelText(/Model ID/i), { target: { value: 'gemini-new' } })
    fireEvent.change(screen.getByLabelText(/API Key/i), { target: { value: 'key-new' } })
    
    fireEvent.click(screen.getByText(/Save Model/i))
    
    await waitFor(() => {
      expect(api.createAdminModel).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'gemini',
        modelId: 'gemini-new',
        apiKey: 'key-new'
      }))
    })
  })

  it('toggles model active status', async () => {
    vi.mocked(api.updateAdminModel).mockResolvedValue({
        ...mockConfigs[1],
        isActive: true
    })

    render(<AdminSettings />)
    
    await waitFor(() => {
      expect(screen.getByText('llama-3')).toBeDefined()
    })

    const activateButton = screen.getByText('Activate')
    fireEvent.click(activateButton)
    
    await waitFor(() => {
      expect(api.updateAdminModel).toHaveBeenCalledWith(2, { isActive: true })
    })
  })

  it('deletes a dynamic model', async () => {
    window.confirm = vi.fn().mockReturnValue(true)
    vi.mocked(api.deleteAdminModel).mockResolvedValue({ success: true })

    render(<AdminSettings />)
    
    await waitFor(() => {
      expect(screen.getByText('llama-3')).toBeDefined()
    })

    const deleteButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-trash2'))
    fireEvent.click(deleteButtons[0])
    
    await waitFor(() => {
      expect(api.deleteAdminModel).toHaveBeenCalledWith(2)
    })
  })
})
