/**
 * ELO Rating System for Chess AI Players
 *
 * Features:
 * - Starting ELO: 1600
 * - Volatile early games (higher K-factor for first 30 games)
 * - Stabilizes after 30 games
 * - Standard FIDE-style calculation
 */

export interface EloCalculationResult {
  newRating: number;
  ratingChange: number;
  kFactor: number;
  expectedScore: number;
}

export interface PlayerStats {
  id: string;
  name: string;
  displayName: string;
  eloRating: number;
  peakElo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

/**
 * Calculate K-factor based on number of games played
 * - First 10 games: K=40 (very volatile)
 * - Games 11-30: K=32 (moderately volatile)
 * - Games 31+: K=24 (stable)
 * - Elite players (2400+): K=16 (very stable)
 */
export function getKFactor(gamesPlayed: number, currentRating: number): number {
  if (currentRating >= 2400) {
    return 16; // Elite player - very stable
  }

  if (gamesPlayed < 10) {
    return 40; // Very volatile early games
  }

  if (gamesPlayed < 30) {
    return 32; // Moderately volatile
  }

  return 24; // Stable rating
}

/**
 * Calculate expected score (win probability)
 * Formula: 1 / (1 + 10^((opponentRating - playerRating) / 400))
 */
export function calculateExpectedScore(
  playerRating: number,
  opponentRating: number
): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculate new ELO rating after a game
 *
 * @param playerRating - Current ELO rating
 * @param opponentRating - Opponent's ELO rating
 * @param actualScore - 1.0 for win, 0.5 for draw, 0.0 for loss
 * @param gamesPlayed - Number of games played (for K-factor calculation)
 * @returns EloCalculationResult with new rating and details
 */
export function calculateNewElo(
  playerRating: number,
  opponentRating: number,
  actualScore: number,
  gamesPlayed: number
): EloCalculationResult {
  const kFactor = getKFactor(gamesPlayed, playerRating);
  const expectedScore = calculateExpectedScore(playerRating, opponentRating);
  const ratingChange = Math.round(kFactor * (actualScore - expectedScore));
  const newRating = playerRating + ratingChange;

  return {
    newRating: Math.max(100, newRating), // Minimum rating of 100
    ratingChange,
    kFactor,
    expectedScore,
  };
}

/**
 * Calculate ELO changes for both players in a match
 */
export function calculateMatchElo(
  player1Rating: number,
  player1GamesPlayed: number,
  player2Rating: number,
  player2GamesPlayed: number,
  result: 'player1_win' | 'player2_win' | 'draw'
): {
  player1: EloCalculationResult;
  player2: EloCalculationResult;
} {
  let player1Score: number;
  let player2Score: number;

  switch (result) {
    case 'player1_win':
      player1Score = 1.0;
      player2Score = 0.0;
      break;
    case 'player2_win':
      player1Score = 0.0;
      player2Score = 1.0;
      break;
    case 'draw':
      player1Score = 0.5;
      player2Score = 0.5;
      break;
  }

  return {
    player1: calculateNewElo(
      player1Rating,
      player2Rating,
      player1Score,
      player1GamesPlayed
    ),
    player2: calculateNewElo(
      player2Rating,
      player1Rating,
      player2Score,
      player2GamesPlayed
    ),
  };
}

/**
 * Convert game result to player-specific result
 */
export function getPlayerResult(
  gameResult: string,
  playerColor: 'white' | 'black'
): 'win' | 'loss' | 'draw' {
  if (gameResult === 'draw') return 'draw';

  if (
    (gameResult === 'white_win' && playerColor === 'white') ||
    (gameResult === 'black_win' && playerColor === 'black')
  ) {
    return 'win';
  }

  return 'loss';
}

/**
 * Get rating change description for display
 */
export function getRatingChangeDescription(change: number): string {
  const absChange = Math.abs(change);

  if (absChange === 0) return 'Rating unchanged';

  const direction = change > 0 ? '+' : '';

  if (absChange >= 50) {
    return `${direction}${change} (Huge ${change > 0 ? 'gain' : 'loss'}!)`;
  } else if (absChange >= 30) {
    return `${direction}${change} (Big ${change > 0 ? 'gain' : 'loss'})`;
  } else if (absChange >= 15) {
    return `${direction}${change} (Significant ${change > 0 ? 'gain' : 'loss'})`;
  } else {
    return `${direction}${change}`;
  }
}

/**
 * Get rating category description
 */
export function getRatingCategory(rating: number): {
  category: string;
  color: string;
  emoji: string;
} {
  if (rating >= 2400) {
    return { category: 'Grandmaster', color: '#FFD700', emoji: '👑' };
  } else if (rating >= 2200) {
    return { category: 'Master', color: '#C0C0C0', emoji: '⭐' };
  } else if (rating >= 2000) {
    return { category: 'Expert', color: '#CD7F32', emoji: '🏆' };
  } else if (rating >= 1800) {
    return { category: 'Advanced', color: '#4169E1', emoji: '💎' };
  } else if (rating >= 1600) {
    return { category: 'Intermediate', color: '#32CD32', emoji: '✨' };
  } else if (rating >= 1400) {
    return { category: 'Developing', color: '#FFA500', emoji: '📈' };
  } else {
    return { category: 'Beginner', color: '#808080', emoji: '🌱' };
  }
}

/**
 * Calculate win probability percentage
 */
export function getWinProbabilityPercent(
  playerRating: number,
  opponentRating: number
): number {
  return Math.round(calculateExpectedScore(playerRating, opponentRating) * 100);
}
