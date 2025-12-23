import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MoveList } from './MoveList'
import type { Move } from '@/api'

describe('MoveList', () => {
  const mockMoves: Move[] = [
    { id: 1, gameId: 'g1', moveNumber: 1, playerColor: 'white', move: 'e4', fen: 'fen1', createdAt: '' },
    { id: 2, gameId: 'g1', moveNumber: 1, playerColor: 'black', move: 'e5', fen: 'fen2', createdAt: '' },
    { id: 3, gameId: 'g1', moveNumber: 2, playerColor: 'white', move: 'Nf3', fen: 'fen3', createdAt: '' },
  ]

  it('renders a list of moves paired by number', () => {
    render(<MoveList moves={mockMoves} onMoveClick={() => {}} />)
    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('e4')).toBeInTheDocument()
    expect(screen.getByText('e5')).toBeInTheDocument()
    expect(screen.getByText('2.')).toBeInTheDocument()
    expect(screen.getByText('Nf3')).toBeInTheDocument()
  })

  it('calls onMoveClick when a move is clicked', () => {
    const onMoveClick = vi.fn()
    render(<MoveList moves={mockMoves} onMoveClick={onMoveClick} />)
    
    fireEvent.click(screen.getByText('e4'))
    expect(onMoveClick).toHaveBeenCalledWith(0) // first move in array

    fireEvent.click(screen.getByText('Nf3'))
    expect(onMoveClick).toHaveBeenCalledWith(2) // third move in array
  })

  it('highlights the selected move', () => {
    render(<MoveList moves={mockMoves} onMoveClick={() => {}} selectedMoveIndex={1} />)
    const blackMove = screen.getByText('e5').closest('button')
    expect(blackMove).toHaveClass('bg-primary')
  })
})
