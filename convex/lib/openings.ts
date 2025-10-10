import { Chess } from "chess.js";

type Opening = {
  eco: string;
  name: string;
  pgn: string;
  fen: string;
  url?: string;
};

export async function findReference(chess: Chess) {
  const history = chess.history();
  if (history.length === 0) {
    return { reference: undefined, opening: undefined };
  }
  const url = `https://explorer.lichess.ovh/masters?play=${history.join(
    ","
  )}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Lichess API failed with status ${response.status}`);
    return { reference: undefined, opening: undefined };
  }
  const data = (await response.json()) as LichessOpening;

  let opening;
  if (data.opening) {
    opening = {
      name: data.opening.name,
      url: `https://lichess.org/opening/${data.opening.name.replace(
        /[ ,:]/g,
        "_"
      )}`,
    };
  }

  let reference;
  const mostPopularMove = data.moves[0];
  if (mostPopularMove) {
    const pgn = `${chess.pgn()} ${mostPopularMove.san}`;
    const description = `The most popular move in this position is ${mostPopularMove.san}. It has been played in ${mostPopularMove.white} games where white won, ${mostPopularMove.draws} games where it was a draw, and ${mostPopularMove.black} games where black won.`;
    reference = {
      pgn,
      description,
    };
  }

  return { reference, opening };
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