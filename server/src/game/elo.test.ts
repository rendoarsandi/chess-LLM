import { describe, it, expect } from 'vitest'
import { calculateEloChange } from './elo'

describe('ELO Calculation Utility', () => {
  it('calculates rating change correctly for a win (equal ratings)', () => {
    // Expected change = 32 * (1 - 0.5) = 16
    const change = calculateEloChange(1200, 1200, 1)
    expect(change).toBe(16)
  })

  it('calculates rating change correctly for a loss (equal ratings)', () => {
    // Expected change = 32 * (0 - 0.5) = -16
    const change = calculateEloChange(1200, 1200, 0)
    expect(change).toBe(-16)
  })

  it('calculates rating change correctly for a draw (equal ratings)', () => {
    // Expected change = 32 * (0.5 - 0.5) = 0
    const change = calculateEloChange(1200, 1200, 0.5)
    expect(change).toBe(0)
  })

  it('calculates higher gain for winning against stronger opponent', () => {
    // Player A (1200) wins against Player B (1600)
    // Expected Score EA = 1 / (1 + 10^((1600-1200)/400)) = 1 / (1 + 10^1) = 1/11 approx 0.0909
    // Change = 32 * (1 - 0.0909) = 32 * 0.9091 = 29.09 approx 29
    const change = calculateEloChange(1200, 1600, 1)
    expect(change).toBeGreaterThan(16)
    expect(change).toBeLessThan(32)
  })

  it('calculates lower gain for winning against weaker opponent', () => {
    // Player A (1600) wins against Player B (1200)
    // Expected Score EA = 1 / (1 + 10^((1200-1600)/400)) = 1 / (1 + 10^-1) = 1 / 1.1 approx 0.9091
    // Change = 32 * (1 - 0.9091) = 32 * 0.0909 = 2.9 approx 3
    const change = calculateEloChange(1600, 1200, 1)
    expect(change).toBeLessThan(16)
    expect(change).toBeGreaterThan(0)
  })

  it('rounds the results to the nearest integer', () => {
    const change = calculateEloChange(1200, 1250, 1)
    // EA = 1 / (1 + 10^(50/400)) = 1 / (1 + 10^0.125) = 1 / (1 + 1.333) = 0.4286
    // Change = 32 * (1 - 0.4286) = 32 * 0.5714 = 18.28 approx 18
    expect(Number.isInteger(change)).toBe(true)
    expect(change).toBe(18)
  })
})
