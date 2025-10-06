"use client";

import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function ChessBoard({ gameId }: { gameId: Id<"games"> }) {
  const game = useQuery(api.games.find, { id: gameId });
  const move = useMutation(api.games.move);

  const [moveFrom, setMoveFrom] = useState("");

  if (!game) {
    return <div>Loading...</div>;
  }

  function onSquareClick(square: string) {
    if (moveFrom === "") {
      setMoveFrom(square);
      return;
    }

    if (moveFrom === square) {
      setMoveFrom("");
      return;
    }

    const gameLogic = new Chess(game.fen);
    const legalMove = gameLogic.move({
      from: moveFrom,
      to: square,
      promotion: "q", // always promote to a queen for simplicity
    });

    if (legalMove) {
      move({ id: gameId, from: moveFrom, to: square, promotion: "q" });
    }
    setMoveFrom("");
  }

  return (
    <Chessboard
      position={game.fen}
      onSquareClick={onSquareClick}
      boardOrientation={game.turn === "w" ? "white" : "black"}
    />
  );
}