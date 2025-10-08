"use client";

import { useState, useEffect, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  createChessFromFen,
  getLegalMovesUCI,
  makeMove,
  getCurrentTurn,
  getMoveCount,
} from "@/lib/chess-utils";
import { identifyOpening } from "@/convex/openings";

interface ChessGameProps {
  gameId: Id<"games">;
  mode: "human-vs-ai" | "ai-vs-ai";
  whitePlayer: string;
  blackPlayer: string;
}

export default function ChessGame({
  gameId,
  mode,
  whitePlayer,
  blackPlayer,
}: ChessGameProps) {
  const [chess] = useState(() => new Chess());
  const [position, setPosition] = useState(chess.fen());
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Convex hooks
  const game = useQuery(api.games.getGame, { gameId });
  const moves = useQuery(api.games.getMoves, { gameId });
  const illegalMoves = useQuery(api.games.getIllegalMoves, { gameId });
  
  const updateGameState = useMutation(api.games.updateGameState);
  const recordMove = useMutation(api.games.recordMove);
  const recordIllegalMove = useMutation(api.games.recordIllegalMove);
  const completeGame = useMutation(api.games.completeGame);
  const startGame = useMutation(api.games.startGame);
  
  const generateAIMove = useAction(api.ai.generateAIMove);

  // Sync chess state with game
  useEffect(() => {
    if (game?.fen) {
      chess.load(game.fen);
      setPosition(game.fen);
    }
  }, [game?.fen, chess]);

  // Auto-start game if in AI vs AI mode
  useEffect(() => {
    if (game?.status === "waiting" && mode === "ai-vs-ai") {
      startGame({ gameId });
    }
  }, [game?.status, mode, gameId, startGame]);

  // Process AI moves
  const processAIMove = useCallback(async () => {
    if (!game || game.status !== "in-progress" || isProcessing) return;

    const currentTurn = getCurrentTurn(chess);
    const currentPlayer = currentTurn === "white" ? whitePlayer : blackPlayer;

    // Check if current player is AI
    if (currentPlayer === "human") return;

    setIsProcessing(true);

    try {
      const legalMoves = getLegalMovesUCI(chess);
      const opening = identifyOpening(chess.pgn());

      // Generate AI move
      const aiResponse = await generateAIMove({
        gameId,
        fen: chess.fen(),
        pgn: chess.pgn(),
        color: currentTurn,
        aiModel: currentPlayer,
        legalMoves,
        openingInfo: opening ? { name: opening.name, eco: opening.eco } : undefined,
      });

      // Make the move
      const fenBefore = chess.fen();
      const moveResult = makeMove(chess, aiResponse.move);

      if (!moveResult.success) {
        // Record illegal move
        await recordIllegalMove({
          gameId,
          color: currentTurn,
          attemptedMove: aiResponse.move,
          error: moveResult.error || "Unknown error",
          fen: fenBefore,
          aiModel: currentPlayer,
        });

        setIsProcessing(false);
        return;
      }

      // Update position
      setPosition(chess.fen());
      setLastMove({
        from: aiResponse.move.substring(0, 2),
        to: aiResponse.move.substring(2, 4),
      });

      // Record the move
      await recordMove({
        gameId,
        moveNumber: getMoveCount(chess),
        color: currentTurn,
        from: aiResponse.move.substring(0, 2),
        to: aiResponse.move.substring(2, 4),
        piece: moveResult.move!.piece,
        san: moveResult.move!.san,
        fenBefore,
        fenAfter: chess.fen(),
        aiModel: currentPlayer,
        reasoning: aiResponse.reasoning,
        evaluation: aiResponse.evaluation,
        alternativeMoves: aiResponse.alternativeMoves,
        thinkingTime: aiResponse.thinkingTime,
      });

      // Update game state
      const newOpening = identifyOpening(chess.pgn());
      await updateGameState({
        gameId,
        fen: chess.fen(),
        pgn: chess.pgn(),
        currentTurn: getCurrentTurn(chess),
        moveCount: getMoveCount(chess),
        openingName: newOpening?.name,
        openingEco: newOpening?.eco,
      });

      // Check if game is over
      if (moveResult.isGameOver) {
        let result = "1/2-1/2";
        if (moveResult.winner === "white") result = "1-0";
        if (moveResult.winner === "black") result = "0-1";

        await completeGame({
          gameId,
          result,
          resultReason: moveResult.gameOverReason || "unknown",
          winner: moveResult.winner,
        });
      }
    } catch (error) {
      console.error("Error processing AI move:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    game,
    chess,
    isProcessing,
    whitePlayer,
    blackPlayer,
    gameId,
    generateAIMove,
    recordMove,
    recordIllegalMove,
    updateGameState,
    completeGame,
  ]);

  // Auto-process AI moves
  useEffect(() => {
    if (game?.status === "in-progress" && !isProcessing) {
      const currentTurn = getCurrentTurn(chess);
      const currentPlayer = currentTurn === "white" ? whitePlayer : blackPlayer;

      if (currentPlayer !== "human") {
        // Add small delay for better UX
        const timer = setTimeout(() => {
          processAIMove();
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [game?.status, game?.currentTurn, isProcessing, chess, whitePlayer, blackPlayer, processAIMove]);

  // Handle human moves
  const onDrop = useCallback(
    ({ sourceSquare, targetSquare }: any) => {
      if (!game || game.status !== "in-progress" || isProcessing) return false;

      const currentTurn = getCurrentTurn(chess);
      const currentPlayer = currentTurn === "white" ? whitePlayer : blackPlayer;

      // Only allow human moves
      if (currentPlayer !== "human") return false;

      const uciMove = `${sourceSquare}${targetSquare}`;
      const fenBefore = chess.fen();
      const moveResult = makeMove(chess, uciMove);

      if (!moveResult.success) {
        return false;
      }

      // Update position
      setPosition(chess.fen());
      setLastMove({ from: sourceSquare, to: targetSquare });

      // Record the move (async but don't await)
      recordMove({
        gameId,
        moveNumber: getMoveCount(chess),
        color: currentTurn,
        from: sourceSquare,
        to: targetSquare,
        piece: moveResult.move!.piece,
        san: moveResult.move!.san,
        fenBefore,
        fenAfter: chess.fen(),
      });

      // Update game state (async but don't await)
      const newOpening = identifyOpening(chess.pgn());
      updateGameState({
        gameId,
        fen: chess.fen(),
        pgn: chess.pgn(),
        currentTurn: getCurrentTurn(chess),
        moveCount: getMoveCount(chess),
        openingName: newOpening?.name,
        openingEco: newOpening?.eco,
      });

      // Check if game is over
      if (moveResult.isGameOver) {
        let result = "1/2-1/2";
        if (moveResult.winner === "white") result = "1-0";
        if (moveResult.winner === "black") result = "0-1";

        completeGame({
          gameId,
          result,
          resultReason: moveResult.gameOverReason || "unknown",
          winner: moveResult.winner,
        });
      }

      return true;
    },
    [
      game,
      chess,
      isProcessing,
      whitePlayer,
      blackPlayer,
      gameId,
      recordMove,
      updateGameState,
      completeGame,
    ]
  );

  return (
    <div className="w-full max-w-[600px]">
      <Chessboard
        options={{
          position,
          onPieceDrop: onDrop,
          squareStyles: lastMove
            ? {
                [lastMove.from]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
                [lastMove.to]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
              }
            : {},
        }}
      />
    </div>
  );
}

