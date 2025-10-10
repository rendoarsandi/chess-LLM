"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChessBoard } from "./Chessboard";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

export function Game() {
  const [gameId, setGameId] = useState<Id<"games"> | null>(null);
  const createGame = useMutation(api.games.create);

  async function handleNewGame(white: string, black: string) {
    const newGameId = await createGame({
      white: white === "human" ? undefined : white,
      black: black === "human" ? undefined : black,
    });
    setGameId(newGameId);
  }

  if (!gameId) {
    return (
      <div>
        <button onClick={() => handleNewGame("gemini-2.5-pro", "human")}>
          Play as Black
        </button>
        <button onClick={() => handleNewGame("human", "gemini-2.5-pro")}>
          Play as White
        </button>
        <button
          onClick={() =>
            handleNewGame("gemini-2.5-pro", "gemini-2.5-flash")
          }
        >
          AI vs AI
        </button>
      </div>
    );
  }

  return <GameDisplay gameId={gameId} />;
}

function GameDisplay({ gameId }: { gameId: Id<"games"> }) {
  const game = useQuery(api.games.find, { id: gameId });

  if (!game) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex gap-4">
      <div className="w-[400px]">
        <ChessBoard gameId={gameId} />
      </div>
      <div>
        <h2>Game Status</h2>
        <p>{game.status}</p>
        {game.winner && <p>Winner: {game.winner}</p>}
        <h2>AI Reasoning</h2>
        <div>
          <h3>
            White ({game.players?.white?.model}) - Errors:{" "}
            {game.players?.white?.errors}
          </h3>
          <ul>
            {game.players?.white?.reasoning?.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>
            Black ({game.players?.black?.model}) - Errors:{" "}
            {game.players?.black?.errors}
          </h3>
          <ul>
            {game.players?.black?.reasoning?.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}