import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThinkingPanel } from './ThinkingPanel'

describe('ThinkingPanel', () => {
  const mockThinking = {
    modelName: 'Gemini 3.0 Flash',
    opening: 'Sicilian Defense',
    candidates: ['c5', 'e6', 'd6'],
    reasoning: 'Fighting for the center.'
  }

  it('renders model name and player side', () => {
    render(<ThinkingPanel side="white" {...mockThinking} />)
    expect(screen.getByText(/white/i)).toBeInTheDocument()
    expect(screen.getByText(/gemini 3.0 flash/i)).toBeInTheDocument()
  })

  it('renders opening name', () => {
    render(<ThinkingPanel side="white" {...mockThinking} />)
    expect(screen.getByText(/sicilian defense/i)).toBeInTheDocument()
  })

  it('renders candidates', () => {
    render(<ThinkingPanel side="white" {...mockThinking} />)
    expect(screen.getByText(/c5/i)).toBeInTheDocument()
    expect(screen.getByText(/e6/i)).toBeInTheDocument()
    expect(screen.getByText(/d6/i)).toBeInTheDocument()
  })

  it('renders reasoning', () => {
    render(<ThinkingPanel side="white" {...mockThinking} />)
    expect(screen.getByText(/fighting for the center/i)).toBeInTheDocument()
  })

  it('renders placeholder when no thinking data provided', () => {
    render(<ThinkingPanel side="black" modelName="Random Bot" />)
    expect(screen.getByText(/waiting for move/i)).toBeInTheDocument()
  })
})
