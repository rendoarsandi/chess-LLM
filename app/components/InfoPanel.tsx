"use client";

import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function InfoPanel({ gameId }: { gameId: Id<"games"> | null }) {
  const game = useQuery(api.games.get, gameId ? { id: gameId } : "skip");

  if (!game) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg shadow-lg h-full">
        <h2 className="text-xl font-bold mb-4">Game Info</h2>
        <p className="text-gray-400">No game in progress. Create a new game to begin.</p>
      </div>
    );
  }

  const getStatusMessage = () => {
    switch (game.status) {
      case "in_progress":
        return game.turn === "w" ? "White's Turn" : "Black's Turn";
      case "checkmate":
        return `Checkmate! ${game.winner === "w" ? "White" : "Black"} wins.`;
      case "stalemate":
        return "Stalemate! The game is a draw.";
      case "draw":
        return "The game is a draw.";
      case "illegal_move_loss":
        return `Game over. ${game.winner === "w" ? "White" : "Black"} wins due to illegal moves.`;
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-lg space-y-4 h-full text-white">
      <div>
        <h3 className="text-lg font-semibold mb-1">Status</h3>
        <p className="text-blue-300 font-mono">{getStatusMessage()}</p>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1">AI Reasoning</h3>
        <p className="text-gray-300 italic text-sm h-24 overflow-y-auto bg-gray-900 p-2 rounded">
          {game.aiReasoning || "Waiting for AI move..."}
        </p>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1">Opening</h3>
        <p className="text-gray-300 font-mono text-sm">{game.openingName || "Unknown"}</p>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1">Illegal Moves</h3>
        <div className="font-mono text-sm">
            <p>White: {game.illegalMoveCounter.w} / 5</p>
            <p>Black: {game.illegalMoveCounter.b} / 5</p>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1">PGN</h3>
        <textarea
          readOnly
          value={game.pgn}
          className="w-full h-48 p-2 bg-gray-900 border border-gray-700 rounded-md text-sm font-mono resize-none"
        />
      </div>
    </div>
  );
}
