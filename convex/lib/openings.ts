import { Chess } from "chess.js";

type Opening = {
  eco: string;
  name: string;
  pgn: string;
  fen: string;
  url?: string;
};

export async function findReference(chess: Chess) {
  const history = chess.history({ verbose: true });
  if (history.length === 0) {
    return;
  }
  const lastMove = history[history.length - 1];
  const turn = lastMove.color === "w" ? "black" : "white";
  const url = `https://explorer.lichess.ovh/masters?play=${chess
    .history()
    .join(", ")}&player=&variant=standard&turn=${turn}`;
  const response = await fetch(url);
  const data = (await response.json()) as LichessOpening;
  const mostPopularMove = data.moves[0];
  if (!mostPopularMove) {
    return;
  }
  const pgn = `${chess.pgn()} ${mostPopularMove.san}`;
  const description = `The most popular move in this position is ${mostPopularMove.san}. It has been played in ${mostPopularMove.white} games where white won, ${mostPopularMove.draws} games where it was a draw, and ${mostPopularMove.black} games where black won.`;
  return {
    pgn,
    description,
  };
}

type LichessGame = {
  id: string;
  winner: "white" | "black" | null;
  speed?: "bullet" | "blitz" | "rapid" | "classical";
  mode?: "rated" | "casual";
  year: number;
  white: {
    name: string;
    rating: number;
  };
  black: {
    name: string;
    rating: number;
  };
};

type LichessMove = {
  uci: string;
  san: string;
  averageRating: number;
  white: number;
  draws: number;
  black: number;
  game?: LichessGame;
};

type LichessOpening = {
  opening?: Opening;
  white: number;
  draws: number;
  black: number;
  moves: LichessMove[];
  recentGames: LichessGame[];
  topGames: LichessGame[];
};