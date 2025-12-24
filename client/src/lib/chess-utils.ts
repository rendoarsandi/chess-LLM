import { Chess } from 'chess.js';

/**
 * Converts a UCI move string (e.g., "e2e4", "e7e8q") to SAN (e.g., "e4", "e8=Q")
 * based on a specific position.
 */
export function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length === 5 ? uci[4] : undefined
    });
    return move.san;
  } catch {
    console.warn('[uciToSan] Failed to convert move:', uci);
    return uci;
  }
}

/**
 * Converts a PV (Principal Variation) string of UCI moves to a string of SAN moves.
 */
export function pvToSan(fen: string, pv: string, maxMoves: number = 10): string {
  const chess = new Chess(fen);
  const uciMoves = pv.split(' ');
  const sanMoves: string[] = [];
  
  for (let i = 0; i < Math.min(uciMoves.length, maxMoves); i++) {
    const uci = uciMoves[i];
    try {
      const isWhite = chess.turn() === 'w';
      const moveNumber = chess.moveNumber();
      
      // Standard chess notation: 
      // 1. e4 (White)
      // 1... e5 (Black starting a line or after a break)
      // If we are showing a sequence, we only need the number for white moves.
      let prefix = '';
      if (isWhite) {
        prefix = `${moveNumber}. `;
      } else if (i === 0) {
        // If the very first move of the PV is black, we need the "..." notation
        prefix = `${moveNumber}... `;
      }
      
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length === 5 ? uci[4] : undefined
      });
      
      sanMoves.push(`${prefix}${move.san}`);
    } catch {
      sanMoves.push(uci);
      break; 
    }
  }
  
  return sanMoves.join(' ');
}
