import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChessboardContainer } from './Chessboard'

// Mock react-chessboard
vi.mock('react-chessboard', () => ({
  Chessboard: vi.fn(({ options }) => (
    <div 
      data-testid="mock-chessboard" 
      data-position={options?.position} 
      data-orientation={options?.boardOrientation} 
    />
  ))
}))

describe('ChessboardContainer', () => {
  it('renders the chessboard', () => {
    render(<ChessboardContainer />)
    const container = screen.getByTestId('chess-board-container')
    expect(container).toBeInTheDocument()
  })

  it('passes boardOrientation to internal Chessboard', () => {
    const { rerender } = render(<ChessboardContainer boardOrientation="white" />)
    expect(screen.getByTestId('mock-chessboard')).toHaveAttribute('data-orientation', 'white')
    
    rerender(<ChessboardContainer boardOrientation="black" />)
    expect(screen.getByTestId('mock-chessboard')).toHaveAttribute('data-orientation', 'black')
  })

  it('renders without crashing when highlightSquares is provided', () => {
    render(
      <ChessboardContainer 
        highlightSquares={{ from: 'e2', to: 'e4' }} 
      />
    )
    expect(screen.getByTestId('chess-board-container')).toBeInTheDocument()
  })

  it('updates position when FEN prop changes', () => {
    const initialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    const { rerender } = render(<ChessboardContainer fen={initialFen} />)
    const board = screen.getByTestId('mock-chessboard')
    expect(board).toHaveAttribute('data-position', initialFen)
    
    // Rerender with a new FEN
    const newFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    rerender(<ChessboardContainer fen={newFen} />)
    
    const updatedBoard = screen.getByTestId('mock-chessboard')
    expect(updatedBoard).toHaveAttribute('data-position', newFen)
  })
})