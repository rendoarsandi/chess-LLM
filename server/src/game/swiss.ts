export interface Player {
  id: string
  score: number
}

export interface Matchup {
  white: string
  black: string
}

export function generatePairings(players: Player[], history: Matchup[]): Matchup[] {
  // Sort players by score descending. For same score, could use tiebreaks or random.
  // Using a stable sort with a bit of randomness for equal scores.
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return Math.random() - 0.5
  })

  const pairings: Matchup[] = []
  const paired = new Set<string>()

  // Handle BYE for odd number of players
  if (sortedPlayers.length % 2 !== 0) {
    // Lowest player gets the BYE (simplified: last one in sorted list who hasn't had a bye)
    // For now, just the last one.
    const byePlayer = sortedPlayers.pop()!
    pairings.push({ white: byePlayer.id, black: 'BYE' })
    paired.add(byePlayer.id)
  }

  const hasPlayed = (p1: string, p2: string) => {
    return history.some(
      (m) => (m.white === p1 && m.black === p2) || (m.white === p2 && m.black === p1),
    )
  }

  for (let i = 0; i < sortedPlayers.length; i++) {
    const p1 = sortedPlayers[i]
    if (paired.has(p1.id)) continue

    let found = false
    for (let j = i + 1; j < sortedPlayers.length; j++) {
      const p2 = sortedPlayers[j]
      if (paired.has(p2.id)) continue

      if (!hasPlayed(p1.id, p2.id)) {
        pairings.push({ white: p1.id, black: p2.id })
        paired.add(p1.id)
        paired.add(p2.id)
        found = true
        break
      }
    }

    // If no opponent found that hasn't been played before (extreme case in small tournaments)
    // Just pair with the first available.
    if (!found) {
      for (let j = i + 1; j < sortedPlayers.length; j++) {
        const p2 = sortedPlayers[j]
        if (paired.has(p2.id)) continue
        pairings.push({ white: p1.id, black: p2.id })
        paired.add(p1.id)
        paired.add(p2.id)
        break
      }
    }
  }

  return pairings
}
