import { describe, it, expect } from 'vitest'
import { generatePairings } from './swiss'

describe('Swiss Pairing Logic', () => {
  const players = [
    { id: 'p1', score: 0 },
    { id: 'p2', score: 0 },
    { id: 'p3', score: 0 },
    { id: 'p4', score: 0 },
    { id: 'p5', score: 0 },
    { id: 'p6', score: 0 },
    { id: 'p7', score: 0 },
    { id: 'p8', score: 0 },
  ]

  it('should generate Round 1 pairings (everyone at 0)', () => {
    const pairings = generatePairings(players, [])
    expect(pairings).toHaveLength(4)
    const pairedIds = pairings.flatMap(p => [p.white, p.black])
    expect(new Set(pairedIds).size).toBe(8)
  })

  it('should pair winners with winners in Round 2', () => {
    const playersWithScores = [
      { id: 'p1', score: 10 },
      { id: 'p2', score: 10 },
      { id: 'p3', score: 10 },
      { id: 'p4', score: 10 },
      { id: 'p5', score: 0 },
      { id: 'p6', score: 0 },
      { id: 'p7', score: 0 },
      { id: 'p8', score: 0 },
    ]
    const history = [
      { white: 'p1', black: 'p5' },
      { white: 'p2', black: 'p6' },
      { white: 'p3', black: 'p7' },
      { white: 'p4', black: 'p8' },
    ]
    const pairings = generatePairings(playersWithScores, history)
    
    // Top 4 (score 10) should be paired together
    const topPairings = pairings.filter(p => 
      playersWithScores.find(pl => pl.id === p.white)!.score === 10 &&
      playersWithScores.find(pl => pl.id === p.black)!.score === 10
    )
    expect(topPairings).toHaveLength(2)
  })

  it('should avoid repeat matchups', () => {
    const playersWithScores = [
      { id: 'p1', score: 10 },
      { id: 'p2', score: 10 },
      { id: 'p3', score: 0 },
      { id: 'p4', score: 0 },
    ]
    const history = [
      { white: 'p1', black: 'p2' },
      { white: 'p3', black: 'p4' },
    ]
    const pairings = generatePairings(playersWithScores, history)
    
    // p1 cannot play p2 again, so must play p3 or p4
    pairings.forEach(p => {
      if (p.white === 'p1') expect(p.black).not.toBe('p2')
      if (p.black === 'p1') expect(p.white).not.toBe('p2')
    })
  })

  it('should handle odd number of players with a bye', () => {
    const oddPlayers = players.slice(0, 7)
    const pairings = generatePairings(oddPlayers, [])
    expect(pairings).toHaveLength(4)
    const byePairing = pairings.find(p => p.black === 'BYE' || p.white === 'BYE')
    expect(byePairing).toBeDefined()
  })

  it('should fallback to any available pairing if all options are exhausted', () => {
    const playersWithScores = [
      { id: 'p1', score: 10 },
      { id: 'p2', score: 10 },
      { id: 'p3', score: 0 },
      { id: 'p4', score: 0 },
    ]
    // p1 has played p2, p3, and p4
    const history = [
      { white: 'p1', black: 'p2' },
      { white: 'p1', black: 'p3' },
      { white: 'p1', black: 'p4' },
      { white: 'p2', black: 'p3' },
      { white: 'p2', black: 'p4' },
      { white: 'p3', black: 'p4' },
    ]
    const pairings = generatePairings(playersWithScores, history)
    expect(pairings).toHaveLength(2)
  })
})
