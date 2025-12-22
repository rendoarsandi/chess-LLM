export type Classification = 
  | 'brilliant' 
  | 'great' 
  | 'best' 
  | 'excellent' 
  | 'good' 
  | 'book' 
  | 'inaccuracy' 
  | 'mistake' 
  | 'blunder' 
  | 'miss';

export interface MoveContext {
  beforeEval: number;
  bestMoveEval: number;
  moveEval: number;
  isBestMove: boolean;
  isSacrifice?: boolean;
  isBookMove?: boolean;
}

export class ClassificationEngine {
  /**
   * Classifies a move based on Stockfish evaluations.
   * Logic is based on centipawn loss and win probability shifts.
   */
  static classify(context: MoveContext): Classification {
    if (context.isBookMove) return 'book';

    const { bestMoveEval, moveEval, isBestMove, isSacrifice } = context;
    const cpLoss = bestMoveEval - moveEval;

    if (isBestMove) {
      if (isSacrifice && cpLoss <= 0.2) return 'brilliant';
      return 'best';
    }

    // Miss: When you had a winning advantage but played something that lost most of it
    if (bestMoveEval > 1.5 && moveEval < 0.6) {
        return 'miss';
    }

    if (cpLoss > 2.0) return 'blunder';
    if (cpLoss > 0.8) return 'mistake';
    if (cpLoss > 0.3) return 'inaccuracy';
    if (cpLoss < 0.1) return 'excellent';
    
    return 'good';
  }
}
