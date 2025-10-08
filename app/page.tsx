"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import GameSetup from "@/components/GameSetup";
import ChessGame from "@/components/ChessGame";
import GameInfo from "@/components/GameInfo";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Home() {
  const [currentGameId, setCurrentGameId] = useState<Id<"games"> | null>(null);
  const game = useQuery(
    api.games.getGame,
    currentGameId ? { gameId: currentGameId } : "skip"
  );

  const handleGameCreated = (gameId: Id<"games">) => {
    setCurrentGameId(gameId);
  };

  const handleNewGame = () => {
    setCurrentGameId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Chess AI vs AI
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Powered by Google Gemini AI
              </p>
            </div>
            {currentGameId && (
              <button
                onClick={handleNewGame}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                New Game
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentGameId ? (
          <GameSetup onGameCreated={handleGameCreated} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chess Board */}
            <div className="lg:col-span-2 flex justify-center">
              {game && (
                <ChessGame
                  gameId={currentGameId}
                  mode={game.mode as "human-vs-ai" | "ai-vs-ai"}
                  whitePlayer={game.whitePlayer}
                  blackPlayer={game.blackPlayer}
                />
              )}
            </div>

            {/* Game Info */}
            <div className="lg:col-span-1">
              <GameInfo gameId={currentGameId} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 shadow-sm mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Chess AI vs AI - Built with Next.js, Convex, and Google Gemini
          </p>
        </div>
      </footer>
    </div>
  );
}
