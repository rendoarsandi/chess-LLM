import { Chess, Move, Square } from "chess.js";

export interface MoveResult {
  success: boolean;
  move?: Move;
  error?: string;
  fen?: string;
  pgn?: string;
  isGameOver?: boolean;
  gameOverReason?: "checkmate" | "stalemate" | "draw" | "threefold" | "insufficient";
  winner?: "white" | "black" | "draw";
}

export interface LegalMove {
  from: Square;
  to: Square;
  promotion?: string;
  san: string;
}

/**
 * Create a new chess instance from FEN
 */
export function createChessFromFen(fen: string): Chess {
  try {
    return new Chess(fen);
  } catch (error) {
    console.error("Invalid FEN:", fen, error);
    return new Chess(); // Return default starting position
  }
}

/**
 * Get all legal moves in UCI format
 */
export function getLegalMovesUCI(chess: Chess): string[] {
  const moves = chess.moves({ verbose: true });
  return moves.map(move => `${move.from}${move.to}${move.promotion || ""}`);
}

/**
 * Get all legal moves with details
 */
export function getLegalMoves(chess: Chess): LegalMove[] {
  const moves = chess.moves({ verbose: true });
  return moves.map(move => ({
    from: move.from,
    to: move.to,
    promotion: move.promotion,
    san: move.san,
  }));
}

/**
 * Make a move in UCI format (e.g., "e2e4")
 */
export function makeMove(chess: Chess, uciMove: string): MoveResult {
  try {
    // Parse UCI move
    const from = uciMove.substring(0, 2) as Square;
    const to = uciMove.substring(2, 4) as Square;
    const promotion = uciMove.length > 4 ? uciMove.substring(4) : undefined;

    // Attempt the move
    const move = chess.move({
      from,
      to,
      promotion,
    });

    if (!move) {
      return {
        success: false,
        error: "Illegal move",
      };
    }

    // Check game over conditions
    let isGameOver = false;
    let gameOverReason: MoveResult["gameOverReason"];
    let winner: MoveResult["winner"];

    if (chess.isCheckmate()) {
      isGameOver = true;
      gameOverReason = "checkmate";
      winner = chess.turn() === "w" ? "black" : "white";
    } else if (chess.isStalemate()) {
      isGameOver = true;
      gameOverReason = "stalemate";
      winner = "draw";
    } else if (chess.isDraw()) {
      isGameOver = true;
      gameOverReason = "draw";
      winner = "draw";
    } else if (chess.isThreefoldRepetition()) {
      isGameOver = true;
      gameOverReason = "threefold";
      winner = "draw";
    } else if (chess.isInsufficientMaterial()) {
      isGameOver = true;
      gameOverReason = "insufficient";
      winner = "draw";
    }

    return {
      success: true,
      move,
      fen: chess.fen(),
      pgn: chess.pgn(),
      isGameOver,
      gameOverReason,
      winner,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Make a move in SAN format (e.g., "e4", "Nf3")
 */
export function makeMoveSAN(chess: Chess, san: string): MoveResult {
  try {
    const move = chess.move(san);

    if (!move) {
      return {
        success: false,
        error: "Illegal move",
      };
    }

    // Check game over conditions
    let isGameOver = false;
    let gameOverReason: MoveResult["gameOverReason"];
    let winner: MoveResult["winner"];

    if (chess.isCheckmate()) {
      isGameOver = true;
      gameOverReason = "checkmate";
      winner = chess.turn() === "w" ? "black" : "white";
    } else if (chess.isStalemate()) {
      isGameOver = true;
      gameOverReason = "stalemate";
      winner = "draw";
    } else if (chess.isDraw()) {
      isGameOver = true;
      gameOverReason = "draw";
      winner = "draw";
    } else if (chess.isThreefoldRepetition()) {
      isGameOver = true;
      gameOverReason = "threefold";
      winner = "draw";
    } else if (chess.isInsufficientMaterial()) {
      isGameOver = true;
      gameOverReason = "insufficient";
      winner = "draw";
    }

    return {
      success: true,
      move,
      fen: chess.fen(),
      pgn: chess.pgn(),
      isGameOver,
      gameOverReason,
      winner,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate if a move is legal
 */
export function isMoveLegal(chess: Chess, uciMove: string): boolean {
  const legalMoves = getLegalMovesUCI(chess);
  return legalMoves.includes(uciMove);
}

/**
 * Get game status
 */
export function getGameStatus(chess: Chess) {
  return {
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isDraw: chess.isDraw(),
    isGameOver: chess.isGameOver(),
    turn: chess.turn(),
    fen: chess.fen(),
    pgn: chess.pgn(),
  };
}

/**
 * Convert move to UCI format
 */
export function moveToUCI(move: Move): string {
  return `${move.from}${move.to}${move.promotion || ""}`;
}

/**
 * Parse PGN and return chess instance
 */
export function parsePGN(pgn: string): Chess {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
    return chess;
  } catch (error) {
    console.error("Invalid PGN:", error);
    return new Chess();
  }
}

/**
 * Get piece at square
 */
export function getPieceAt(chess: Chess, square: Square) {
  return chess.get(square);
}

/**
 * Get current turn color
 */
export function getCurrentTurn(chess: Chess): "white" | "black" {
  return chess.turn() === "w" ? "white" : "black";
}

/**
 * Get move count
 */
export function getMoveCount(chess: Chess): number {
  return chess.history().length;
}

