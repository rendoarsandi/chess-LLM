'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type GameMode = 'human-vs-ai' | 'ai-vs-ai';
type PlayerColor = 'w' | 'b';
type AiModel = 'pro' | 'flash' | 'flash-lite';

export default function HomePage() {
  const router = useRouter();
  const [gameMode, setGameMode] = useState<GameMode>('human-vs-ai');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [whiteAiModel, setWhiteAiModel] = useState<AiModel>('flash');
  const [blackAiModel, setBlackAiModel] = useState<AiModel>('flash');

  const handleStartGame = () => {
    // Generate a unique ID for the new game session.
    const gameId = crypto.randomUUID();

    let players;
    if (gameMode === 'human-vs-ai') {
      players = {
        w: playerColor === 'w' ? 'human' : 'ai',
        b: playerColor === 'b' ? 'human' : 'ai',
      };
    } else {
      players = { w: 'ai', b: 'ai' };
    }

    // Store game settings in localStorage to be picked up by the game page.
    const gameSettings = {
      gameMode,
      players,
      // We can add model selection to players object later if needed
      // whiteAiModel,
      // blackAiModel,
    };
    localStorage.setItem(`chess-game-${gameId}`, JSON.stringify(gameSettings));

    // Redirect to the new game page.
    router.push(`/game/${gameId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-900 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center">Setup New Chess Game</h1>

        {/* Game Mode Selection */}
        <div className="space-y-2">
          <label className="block text-lg font-medium">Game Mode</label>
          <div className="flex gap-4">
            <button
              onClick={() => setGameMode('human-vs-ai')}
              className={`flex-1 py-2 px-4 rounded ${
                gameMode === 'human-vs-ai' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              Human vs AI
            </button>
            <button
              onClick={() => setGameMode('ai-vs-ai')}
              className={`flex-1 py-2 px-4 rounded ${
                gameMode === 'ai-vs-ai' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              AI vs AI
            </button>
          </div>
        </div>

        {/* Player Color Selection (only for Human vs AI) */}
        {gameMode === 'human-vs-ai' && (
          <div className="space-y-2">
            <label className="block text-lg font-medium">Your Color</label>
            <div className="flex gap-4">
              <button
                onClick={() => setPlayerColor('w')}
                className={`flex-1 py-2 px-4 rounded ${
                  playerColor === 'w' ? 'bg-white text-black' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                White
              </button>
              <button
                onClick={() => setPlayerColor('b')}
                className={`flex-1 py-2 px-4 rounded ${
                  playerColor === 'b' ? 'bg-black text-white' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Black
              </button>
            </div>
          </div>
        )}

        {/* AI Model Selection can be added here later */}
        {/* For now, we'll use the default 'flash' model */}

        {/* Start Game Button */}
        <button
          onClick={handleStartGame}
          className="w-full py-3 mt-4 font-bold text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Start Game
        </button>
      </div>
    </div>
  );
}