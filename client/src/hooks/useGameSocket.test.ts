import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGameSocket } from './useGameSocket'

describe('useGameSocket', () => {
  it('should be a function', () => {
    expect(typeof useGameSocket).toBe('function')
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useGameSocket(undefined))
    expect(result.current.isConnected).toBe(false)
    expect(result.current.spectatorCount).toBe(0)
    expect(result.current.thinkingStatus).toBe('idle')
  })
})
