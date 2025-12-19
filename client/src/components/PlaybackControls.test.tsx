import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackControls } from './PlaybackControls'

describe('PlaybackControls', () => {
  it('calls correct callback when buttons are clicked', () => {
    const onFirst = vi.fn()
    const onPrev = vi.fn()
    const onNext = vi.fn()
    const onLast = vi.fn()

    render(
      <PlaybackControls 
        onFirst={onFirst} 
        onPrev={onPrev} 
        onNext={onNext} 
        onLast={onLast} 
      />
    )

    fireEvent.click(screen.getByLabelText(/first/i))
    expect(onFirst).toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(/previous/i))
    expect(onPrev).toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(/next/i))
    expect(onNext).toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(/last/i))
    expect(onLast).toHaveBeenCalled()
  })

  it('disables buttons when requested', () => {
    render(
      <PlaybackControls 
        onFirst={() => {}} 
        onPrev={() => {}} 
        onNext={() => {}} 
        onLast={() => {}} 
        prevDisabled={true}
        nextDisabled={true}
      />
    )

    expect(screen.getByLabelText(/first/i)).toBeDisabled()
    expect(screen.getByLabelText(/previous/i)).toBeDisabled()
    expect(screen.getByLabelText(/next/i)).toBeDisabled()
    expect(screen.getByLabelText(/last/i)).toBeDisabled()
  })
})
