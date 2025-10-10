"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChessBoard } from "./Chessboard";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MoveHistory } from "./MoveHistory";

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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-2xl font-semibold">Start a New Game</h2>
        <div className="flex gap-4">
          <Button
            onClick={() => handleNewGame("human", "gemini-2.5-pro")}
            variant="outline"
          >
            Play as White
          </Button>
          <Button onClick={() => handleNewGame("gemini-2.5-pro", "human")}>
            Play as Black
          </Button>
        </div>
        <Button
          onClick={() => handleNewGame("gemini-2.5-pro", "gemini-2.5-flash")}
          variant="secondary"
        >
          Watch AI vs AI
        </Button>
      </div>
    );
  }

  return <GameDisplay gameId={gameId} />;
}

function GameDisplay({ gameId }: { gameId: Id<"games"> }) {
  const game = useQuery(api.games.find, { id: gameId });

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        Loading...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <ChessBoard gameId={gameId} />
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Game Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="capitalize">
              <span className="font-semibold">Status:</span> {game.status}
            </p>
            {game.winner && (
              <p className="capitalize">
                <span className="font-semibold">Winner:</span> {game.winner}
              </p>
            )}
          </CardContent>
        </Card>
        {game.opening && (
          <Card>
            <CardHeader>
              <CardTitle>Opening</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={game.opening.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                {game.opening.name}
              </a>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Move History</CardTitle>
          </CardHeader>
          <CardContent>
            <MoveHistory pgn={game.pgn} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>White</CardTitle>
            <CardDescription>
              {game.players?.white?.model ?? "Human"} - Errors:{" "}
              {game.players?.white?.errors ?? 0}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm space-y-2">
              {game.players?.white?.reasoning?.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Black</CardTitle>
            <CardDescription>
              {game.players?.black?.model ?? "Human"} - Errors:{" "}
              {game.players?.black?.errors ?? 0}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm space-y-2">
              {game.players?.black?.reasoning?.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}