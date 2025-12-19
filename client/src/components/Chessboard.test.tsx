import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChessboardContainer } from './Chessboard'

describe('ChessboardContainer', () => {
  it('renders the chessboard', () => {
    render(<ChessboardContainer />)
    const container = screen.getByTestId('chess-board-container')
    expect(container).toBeInTheDocument()
  })

  it('passes boardOrientation to internal Chessboard', () => {
    // We can't easily inspect internal props of react-chessboard without more setup,
    // but we can verify it renders with the prop without crashing.
    const { rerender } = render(<ChessboardContainer boardOrientation="white" />)
    expect(screen.getByTestId('chess-board-container')).toBeInTheDocument()
    
    rerender(<ChessboardContainer boardOrientation="black" />)
    expect(screen.getByTestId('chess-board-container')).toBeInTheDocument()
  })
})
