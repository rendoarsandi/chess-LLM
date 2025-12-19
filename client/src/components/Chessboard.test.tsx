import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChessboardContainer } from './Chessboard'

describe('ChessboardContainer', () => {
  it('renders the chessboard', () => {
    render(<ChessboardContainer />)
    // react-chessboard usually renders an element with a specific role or data-testid
    // for now we just check if the container renders
    const board = screen.getByTestId('chess-board-container')
    expect(board).toBeInTheDocument()
  })
})
