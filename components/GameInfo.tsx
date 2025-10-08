"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface GameInfoProps {
  gameId: Id<"games">;
}

export default function GameInfo({ gameId }: GameInfoProps) {
  const game = useQuery(api.games.getGame, { gameId });
  const moves = useQuery(api.games.getMoves, { gameId });
  const illegalMoves = useQuery(api.games.getIllegalMoves, { gameId });

  if (!game) {
    return <div className="text-center p-4">Loading game...</div>;
  }

  const lastMove = moves && moves.length > 0 ? moves[moves.length - 1] : null;

  return (
    <div className="space-y-4">
      {/* Game Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-2">Game Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Status:</span>
            <span className="font-medium capitalize">{game.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Mode:</span>
            <span className="font-medium capitalize">{game.mode.replace("-", " ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Current Turn:</span>
            <span className="font-medium capitalize">{game.currentTurn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Moves:</span>
            <span className="font-medium">{game.moveCount}</span>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-2">Players</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">White:</span>
            <div className="text-right">
              <div className="font-medium capitalize">{game.whitePlayer}</div>
              <div className="text-xs text-red-500">
                Illegal moves: {game.whiteIllegalMoves}/5
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Black:</span>
            <div className="text-right">
              <div className="font-medium capitalize">{game.blackPlayer}</div>
              <div className="text-xs text-red-500">
                Illegal moves: {game.blackIllegalMoves}/5
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Opening */}
      {game.openingName && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h3 className="text-lg font-semibold mb-2">Opening</h3>
          <div className="space-y-1 text-sm">
            <div className="font-medium">{game.openingName}</div>
            {game.openingEco && (
              <div className="text-gray-600 dark:text-gray-400">
                ECO: {game.openingEco}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last Move Reasoning */}
      {lastMove?.reasoning && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h3 className="text-lg font-semibold mb-2">
            Last Move Analysis ({lastMove.aiModel})
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Move:</span> {lastMove.san}
            </div>
            {lastMove.evaluation && (
              <div>
                <span className="font-medium">Evaluation:</span>{" "}
                {lastMove.evaluation}
              </div>
            )}
            <div>
              <span className="font-medium">Reasoning:</span>
              <p className="mt-1 text-gray-700 dark:text-gray-300">
                {lastMove.reasoning}
              </p>
            </div>
            {lastMove.alternativeMoves && lastMove.alternativeMoves.length > 0 && (
              <div>
                <span className="font-medium">Alternative moves:</span>
                <div className="mt-1 text-gray-700 dark:text-gray-300">
                  {lastMove.alternativeMoves.join(", ")}
                </div>
              </div>
            )}
            {lastMove.thinkingTime && (
              <div className="text-xs text-gray-500">
                Thinking time: {(lastMove.thinkingTime / 1000).toFixed(2)}s
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Result */}
      {game.status === "completed" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h3 className="text-lg font-semibold mb-2">Game Result</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Result:</span>
              <span className="font-medium">{game.result}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Winner:</span>
              <span className="font-medium capitalize">{game.winner || "Draw"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Reason:</span>
              <span className="font-medium capitalize">
                {game.resultReason?.replace("-", " ")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Illegal Moves */}
      {illegalMoves && illegalMoves.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h3 className="text-lg font-semibold mb-2 text-red-600">
            Illegal Moves ({illegalMoves.length})
          </h3>
          <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
            {illegalMoves.map((illegal: any, idx: number) => (
              <div
                key={idx}
                className="border-l-2 border-red-500 pl-2 py-1"
              >
                <div className="font-medium capitalize">
                  {illegal.color} - {illegal.aiModel}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Attempted: {illegal.attemptedMove}
                </div>
                <div className="text-xs text-red-500">{illegal.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Move History */}
      {moves && moves.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h3 className="text-lg font-semibold mb-2">Move History</h3>
          <div className="max-h-60 overflow-y-auto text-sm">
            <div className="grid grid-cols-3 gap-2">
              {moves.map((move: any, idx: number) => (
                <div key={idx} className="flex items-center gap-1">
                  {move.color === "white" && (
                    <span className="text-gray-500">{move.moveNumber}.</span>
                  )}
                  <span className="font-mono">{move.san}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

