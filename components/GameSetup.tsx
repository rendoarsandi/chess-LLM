"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface GameSetupProps {
  onGameCreated: (gameId: Id<"games">) => void;
}

export default function GameSetup({ onGameCreated }: GameSetupProps) {
  const [mode, setMode] = useState<"human-vs-ai" | "ai-vs-ai">("human-vs-ai");
  const [whitePlayer, setWhitePlayer] = useState("human");
  const [blackPlayer, setBlackPlayer] = useState("gemini-2.5-flash");
  const [isCreating, setIsCreating] = useState(false);

  const createGame = useMutation(api.games.createGame);
  const startGame = useMutation(api.games.startGame);

  const aiModels = [
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Strongest)" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Balanced)" },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Fast)" },
  ];

  const handleCreateGame = async () => {
    setIsCreating(true);
    try {
      const gameId = await createGame({
        mode,
        whitePlayer,
        blackPlayer,
      });

      // Auto-start the game
      await startGame({ gameId });

      onGameCreated(gameId);
    } catch (error) {
      console.error("Error creating game:", error);
      alert("Failed to create game. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Create New Chess Game</h2>

      {/* Game Mode */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Game Mode</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => {
              setMode("human-vs-ai");
              setWhitePlayer("human");
            }}
            className={`p-4 rounded-lg border-2 transition-colors ${
              mode === "human-vs-ai"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
            }`}
          >
            <div className="font-semibold">Human vs AI</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Play against the AI
            </div>
          </button>
          <button
            onClick={() => {
              setMode("ai-vs-ai");
              setWhitePlayer("gemini-2.5-flash");
              setBlackPlayer("gemini-2.5-flash");
            }}
            className={`p-4 rounded-lg border-2 transition-colors ${
              mode === "ai-vs-ai"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
            }`}
          >
            <div className="font-semibold">AI vs AI</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Watch AI agents play
            </div>
          </button>
        </div>
      </div>

      {/* White Player */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">White Player</label>
        {mode === "human-vs-ai" ? (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setWhitePlayer("human")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                whitePlayer === "human"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
              }`}
            >
              Human
            </button>
            <button
              onClick={() => setWhitePlayer(blackPlayer)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                whitePlayer !== "human"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
              }`}
            >
              AI
            </button>
          </div>
        ) : (
          <select
            value={whitePlayer}
            onChange={(e) => setWhitePlayer(e.target.value)}
            className="w-full p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            {aiModels.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Black Player */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Black Player</label>
        {mode === "human-vs-ai" ? (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setBlackPlayer("human")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                blackPlayer === "human"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
              }`}
            >
              Human
            </button>
            <button
              onClick={() => setBlackPlayer(whitePlayer === "human" ? "gemini-2.5-flash" : "human")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                blackPlayer !== "human"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
              }`}
            >
              AI
            </button>
          </div>
        ) : (
          <select
            value={blackPlayer}
            onChange={(e) => setBlackPlayer(e.target.value)}
            className="w-full p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            {aiModels.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* AI Model Selection for Human vs AI */}
      {mode === "human-vs-ai" && (whitePlayer !== "human" || blackPlayer !== "human") && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">AI Model</label>
          <select
            value={whitePlayer !== "human" ? whitePlayer : blackPlayer}
            onChange={(e) => {
              if (whitePlayer !== "human") {
                setWhitePlayer(e.target.value);
              } else {
                setBlackPlayer(e.target.value);
              }
            }}
            className="w-full p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            {aiModels.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Create Game Button */}
      <button
        onClick={handleCreateGame}
        disabled={isCreating || (mode === "human-vs-ai" && whitePlayer === "human" && blackPlayer === "human")}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {isCreating ? "Creating Game..." : "Start Game"}
      </button>

      {mode === "human-vs-ai" && whitePlayer === "human" && blackPlayer === "human" && (
        <p className="mt-2 text-sm text-red-500 text-center">
          Please select at least one AI player
        </p>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold mb-2">Game Rules:</h3>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <li>• Standard chess rules apply</li>
          <li>• AI can read FEN and PGN positions</li>
          <li>• 5 illegal moves = automatic loss</li>
          <li>• AI provides reasoning for each move</li>
          <li>• Opening references are displayed</li>
          {mode === "ai-vs-ai" && (
            <li>• Game runs automatically in the background</li>
          )}
        </ul>
      </div>
    </div>
  );
}

