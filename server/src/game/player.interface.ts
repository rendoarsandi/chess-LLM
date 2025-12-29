export interface Player {
  makeMove(
    fen: string,
    history?: string[],
    variant?: string,
  ): string | null | Promise<string | null>
  getLastThinking?(): { opening?: string; candidates?: string; reasoning?: string } | null
}
