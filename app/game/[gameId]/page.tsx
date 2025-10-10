'use client';

import { Chess } from 'chess.js';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';

// Define the structure of the game state received from the backend
interface GameState {
  fen: string;
  pgn: string;
  turn: 'w' | 'b';
  gameOver: boolean;
  errorCount: number;
  gameMode?: 'human-vs-ai' | 'ai-vs-ai';
  players?: {
    w: 'human' | 'ai';
    b: 'human' | 'ai';
  };
  lastAiReasoning?: string;
  openingName?: string;
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [game, setGame] = useState(new Chess());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/game/${gameId}/websocket`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connection established');
      // Get game settings from localStorage
      const settingsString = localStorage.getItem(`chess-game-${gameId}`);
      if (settingsString) {
        const settings = JSON.parse(settingsString);

        const initPayload = {
          type: 'init',
          payload: {
            gameMode: settings.gameMode,
            players: settings.players,
          },
        };
        socket.send(JSON.stringify(initPayload));

        // If it's an AI vs AI game, send the start signal immediately.
        if (settings.gameMode === 'ai-vs-ai') {
          socket.send(JSON.stringify({ type: 'start' }));
        }

        // Clean up localStorage
        localStorage.removeItem(`chess-game-${gameId}`);
      } else {
        console.warn('No game settings found in localStorage. The game might not initialize correctly.');
        // The backend will just load the persisted state.
      }
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);

      if (message.type === 'update') {
        const state: GameState = message.payload;
        setGameState(state);
        setGame(new Chess(state.fen));
      } else if (message.type === 'error') {
        alert(`Error: ${message.payload.message}`);
      }
    };

    socket.onclose = () => console.log('WebSocket connection closed');
    socket.onerror = (error) => console.error('WebSocket error:', error);

    setWs(socket);

    return () => socket.close();
  }, [gameId]);

  function onDrop(sourceSquare: string, targetSquare: string, piece: string) {
    if (!ws || !gameState || gameState.gameOver) return false;

    // Prevent human from moving when it's not their turn
    const playerType = gameState.players?.[gameState.turn];
    if (playerType !== 'human') {
      return false;
    }

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: piece.slice(1).toLowerCase() ?? 'q',
    };

    ws.send(JSON.stringify({ type: 'move', payload: move }));
    return true;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white p-4">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Chess Game</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            New Game
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-grow" style={{ maxWidth: '600px' }}>
            <Chessboard position={game.fen()} onPieceDrop={onDrop} />
          </div>
          <div className="w-full md:w-80 p-4 bg-gray-900 rounded-lg flex flex-col space-y-2">
            <h2 className="text-2xl font-bold mb-2 border-b border-gray-700 pb-2">Game Info</h2>
            <p><span className="font-semibold">Mode:</span> {gameState?.gameMode ?? '...'}</p>
            <p><span className="font-semibold">Turn:</span> {gameState?.turn === 'w' ? 'White' : 'Black'}</p>
            <p><span className="font-semibold">Game Over:</span> {gameState?.gameOver ? 'Yes' : 'No'}</p>
            <p className={gameState?.errorCount ?? 0 > 0 ? 'text-red-400' : ''}>
              <span className="font-semibold">Errors:</span> {gameState?.errorCount ?? 0} / 5
            </p>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <h3 className="text-xl font-bold mb-2">AI Thoughts</h3>
              <p className="text-sm text-gray-400">
                <span className="font-semibold">Opening:</span> {gameState?.openingName || 'N/A'}
              </p>
              <div className="mt-2 p-2 bg-gray-800 rounded h-32 overflow-y-auto">
                <p className="text-sm italic">
                  {gameState?.lastAiReasoning || 'Waiting for AI move...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}