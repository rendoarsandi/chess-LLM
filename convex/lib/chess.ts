import { Chess, Move } from "chess.js";

export class ChessGame {
  private chess: Chess;

  constructor(pgn?: string) {
    this.chess = new Chess();
    if (pgn) {
      this.chess.loadPgn(pgn);
    }
  }

  move(
    move:
      | string
      | { from: string; to: string; promotion?: string | undefined }
  ): Move | null {
    return this.chess.move(move);
  }

  pgn(): string {
    return this.chess.pgn();
  }

  fen(): string {
    return this.chess.fen();
  }

  turn(): "w" | "b" {
    return this.chess.turn();
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  history(): string[] {
    return this.chess.history();
  }

  ascii(): string {
    return this.chess.ascii();
  }
}