/**
 * Calculates the rating change for a player based on the ELO rating system.
 *
 * @param ratingA The current rating of player A.
 * @param ratingB The current rating of the opponent (player B).
 * @param score Actual score of the game (1 for win, 0.5 for draw, 0 for loss).
 * @param k K-factor (defaults to 32).
 * @returns The rating change (rounded to nearest integer).
 */
export function calculateEloChange(
  ratingA: number,
  ratingB: number,
  score: number,
  k: number = 32,
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
  return Math.round(k * (score - expectedScore))
}
