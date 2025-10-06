"use client";

import { useState, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export default function ChessboardComponent({ gameId }: { gameId: Id<"games"> | null }) {
  const [game, setGame] = useState(new Chess());
  const [error, setError] = useState('');

  const gameData = useQuery(api.games.get, gameId ? { id: gameId } : "skip");
  const makeMove = useMutation(api.games.makeMove);

  const chessPosition = useMemo(() => {
    if (gameData) {
      setGame(new Chess(gameData.fen));
      return gameData.fen;
    }
    return game.fen();
  }, [gameData]);

  async function onDrop(sourceSquare: string, targetSquare: string, piece: string) {
    if (!gameId || !gameData) return false;

    // For now, we assume the user is always white for simplicity.
    // A more robust implementation would track the session's player color.
    if (gameData.turn !== 'w' && gameData.player1.type === 'human') {
        // This logic needs to be improved to handle player color correctly
        // but for now it prevents moving black pieces if player 1 is human.
        return false;
    }

    const gameCopy = new Chess(gameData.fen);
    let moveResult = null;
    try {
        moveResult = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch (e) {
        // This catches invalid move syntax, but chess.js move() returns null for illegal moves.
        return false;
    }

    if (moveResult === null) {
        setError('That move is not allowed.');
        return false;
    }

    try {
        setError('');
        await makeMove({ gameId, move: moveResult.san, player: gameData.turn });
        return true;
    } catch (e: any) {
        setError(e.message);
        return false;
    }
  }

  return (
    <div className="w-full flex flex-col items-center">
        <div style={{ width: 'min(100%, 600px)' }}>
            <Chessboard
                position={chessPosition}
                onPieceDrop={onDrop}
                boardOrientation={gameData?.player1.type === 'human' ? 'white' : 'black'}
            />
        </div>
        {error && <p className="text-red-500 mt-2 font-semibold">{error}</p>}
    </div>
  );
}
