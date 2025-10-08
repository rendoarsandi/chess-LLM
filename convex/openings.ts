// Chess opening database with ECO codes
export interface ChessOpening {
  eco: string;
  name: string;
  moves: string;
}

export const chessOpenings: ChessOpening[] = [
  // King's Pawn Openings
  { eco: "C20", name: "King's Pawn Game", moves: "1. e4 e5" },
  { eco: "C44", name: "Scotch Game", moves: "1. e4 e5 2. Nf3 Nc6 3. d4" },
  { eco: "C50", name: "Italian Game", moves: "1. e4 e5 2. Nf3 Nc6 3. Bc4" },
  { eco: "C53", name: "Giuoco Piano", moves: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5" },
  { eco: "C42", name: "Petrov Defense", moves: "1. e4 e5 2. Nf3 Nf6" },
  { eco: "C65", name: "Ruy Lopez (Spanish Opening)", moves: "1. e4 e5 2. Nf3 Nc6 3. Bb5" },
  { eco: "C68", name: "Ruy Lopez: Exchange Variation", moves: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6" },
  { eco: "C78", name: "Ruy Lopez: Morphy Defense", moves: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O" },
  
  // Sicilian Defense
  { eco: "B20", name: "Sicilian Defense", moves: "1. e4 c5" },
  { eco: "B23", name: "Sicilian: Closed Variation", moves: "1. e4 c5 2. Nc3" },
  { eco: "B27", name: "Sicilian: Hyperaccelerated Dragon", moves: "1. e4 c5 2. Nf3 g6" },
  { eco: "B30", name: "Sicilian: Old Sicilian", moves: "1. e4 c5 2. Nf3 Nc6" },
  { eco: "B40", name: "Sicilian: Paulsen Variation", moves: "1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nc6" },
  { eco: "B50", name: "Sicilian: Dragon Variation", moves: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6" },
  { eco: "B70", name: "Sicilian: Dragon, Yugoslav Attack", moves: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3" },
  { eco: "B90", name: "Sicilian: Najdorf Variation", moves: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6" },
  
  // French Defense
  { eco: "C00", name: "French Defense", moves: "1. e4 e6" },
  { eco: "C02", name: "French: Advance Variation", moves: "1. e4 e6 2. d4 d5 3. e5" },
  { eco: "C11", name: "French: Classical Variation", moves: "1. e4 e6 2. d4 d5 3. Nc3 Nf6" },
  { eco: "C15", name: "French: Winawer Variation", moves: "1. e4 e6 2. d4 d5 3. Nc3 Bb4" },
  
  // Caro-Kann Defense
  { eco: "B10", name: "Caro-Kann Defense", moves: "1. e4 c6" },
  { eco: "B12", name: "Caro-Kann: Advance Variation", moves: "1. e4 c6 2. d4 d5 3. e5" },
  { eco: "B18", name: "Caro-Kann: Classical Variation", moves: "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5" },
  
  // Queen's Pawn Openings
  { eco: "D00", name: "Queen's Pawn Game", moves: "1. d4 d5" },
  { eco: "D06", name: "Queen's Gambit", moves: "1. d4 d5 2. c4" },
  { eco: "D30", name: "Queen's Gambit Declined", moves: "1. d4 d5 2. c4 e6" },
  { eco: "D37", name: "Queen's Gambit Declined: Classical Variation", moves: "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Be7" },
  { eco: "D43", name: "Queen's Gambit Declined: Semi-Slav", moves: "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 c6" },
  { eco: "D20", name: "Queen's Gambit Accepted", moves: "1. d4 d5 2. c4 dxc4" },
  
  // Indian Defenses
  { eco: "E00", name: "Indian Defense", moves: "1. d4 Nf6" },
  { eco: "E60", name: "King's Indian Defense", moves: "1. d4 Nf6 2. c4 g6" },
  { eco: "E70", name: "King's Indian: Normal Variation", moves: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6" },
  { eco: "E90", name: "King's Indian: Classical Variation", moves: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5" },
  { eco: "E20", name: "Nimzo-Indian Defense", moves: "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4" },
  { eco: "E32", name: "Nimzo-Indian: Classical Variation", moves: "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. Qc2" },
  { eco: "E12", name: "Queen's Indian Defense", moves: "1. d4 Nf6 2. c4 e6 3. Nf3 b6" },
  
  // English Opening
  { eco: "A10", name: "English Opening", moves: "1. c4" },
  { eco: "A20", name: "English: Reversed Sicilian", moves: "1. c4 e5" },
  { eco: "A30", name: "English: Symmetrical Variation", moves: "1. c4 c5" },
  
  // Reti Opening
  { eco: "A04", name: "Reti Opening", moves: "1. Nf3" },
  { eco: "A09", name: "Reti: Advance Variation", moves: "1. Nf3 d5 2. c4" },
  
  // Other Openings
  { eco: "A00", name: "Uncommon Opening", moves: "1. g3" },
  { eco: "A01", name: "Nimzowitsch-Larsen Attack", moves: "1. b3" },
  { eco: "B00", name: "King's Pawn Opening", moves: "1. e4" },
  { eco: "D02", name: "London System", moves: "1. d4 d5 2. Nf3 Nf6 3. Bf4" },
  { eco: "A45", name: "Trompowsky Attack", moves: "1. d4 Nf6 2. Bg5" },
];

/**
 * Identify the opening based on the PGN moves
 */
export function identifyOpening(pgn: string): ChessOpening | null {
  // Extract moves from PGN
  const movesMatch = pgn.match(/1\.\s*[^\s]+(?:\s+[^\s]+)?(?:\s+\d+\.\s*[^\s]+(?:\s+[^\s]+)?)*/);
  if (!movesMatch) return null;

  const pgnMoves = movesMatch[0];
  
  // Find the longest matching opening
  let bestMatch: ChessOpening | null = null;
  let longestMatch = 0;

  for (const opening of chessOpenings) {
    if (pgnMoves.startsWith(opening.moves)) {
      if (opening.moves.length > longestMatch) {
        longestMatch = opening.moves.length;
        bestMatch = opening;
      }
    }
  }

  return bestMatch;
}

/**
 * Get opening suggestions based on current position
 */
export function getOpeningSuggestions(pgn: string): ChessOpening[] {
  const movesMatch = pgn.match(/1\.\s*[^\s]+(?:\s+[^\s]+)?(?:\s+\d+\.\s*[^\s]+(?:\s+[^\s]+)?)*/);
  if (!movesMatch) return [];

  const pgnMoves = movesMatch[0];
  
  return chessOpenings.filter(opening => 
    opening.moves.startsWith(pgnMoves) || pgnMoves.startsWith(opening.moves)
  ).slice(0, 5);
}

