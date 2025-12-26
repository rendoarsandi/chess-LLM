export interface ThinkingData {
  opening?: string;
  candidates?: string[];
  reasoning?: string;
}

export interface Game {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  status: 'ongoing' | 'completed' | 'draw' | 'paused';
  variant: 'standard' | 'chess960';
  startPosId?: number;
  fen: string;
  winnerId?: string | null;
  gameOverReason?: string | null;
  pgn?: string | null;
  tournamentId?: string | null;
  roundNumber?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  name: string;
  type: 'llm' | 'human';
  rating: number;
  rating960: number;
  wins: number;
  losses: number;
  draws: number;
  peakRating: number;
  peakRating960: number;
  provider?: string;
  version?: string;
  bio?: string;
  createdAt: string;
}
