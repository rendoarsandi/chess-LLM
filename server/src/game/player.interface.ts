export interface Player {
  makeMove(fen: string, history?: string[]): string | null | Promise<string | null>;
}
