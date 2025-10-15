"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Chess } from "chess.js";
import type { DraggingPieceDataType } from "react-chessboard";

const Chessboard = dynamic(() => import("react-chessboard").then((mod) => ({ default: mod.Chessboard })), {
  ssr: false,
});
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE_URL = "/api/game/default-game";

export default function Home() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState("start");
  const [pgn, setPgn] = useState("");
  const [errorCount, setErrorCount] = useState(0);
  const [isLoss, setIsLoss] = useState(false);
  const [aiReasoning, setAiReasoning] = useState("");
  const [opening, setOpening] = useState("");
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [aiModel, setAiModel] = useState("2.5-flash");
  const [gameMode, setGameMode] = useState("human-vs-ai");

  useEffect(() => {
    const interval = setInterval(() => {
      fetchGameState();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pgn) {
      fetchOpeningName();
    }
  }, [pgn]);

  const fetchGameState = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/state`);
      if (response.ok) {
        const data = await response.json();
        setFen(data.fen);
        setPgn(data.pgn);
        setErrorCount(data.errorCount);
        setIsLoss(data.isLoss);
        const newGame = new Chess();
        newGame.loadPgn(data.pgn);
        setGame(newGame);

        const storedReasoning = await fetch(`${API_BASE_URL}/reasoning`).then(res => res.json());
        if(storedReasoning.reasoning) {
          setAiReasoning(storedReasoning.reasoning);
        }

      }
    } catch (error) {
      console.error("Failed to fetch game state:", error);
    }
  };

  const fetchOpeningName = async () => {
    try {
      const response = await fetch(
        `https://explorer.lichess.ovh/lichess?pgn=${pgn}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.opening) {
          setOpening(data.opening.name);
        }
      }
    } catch (error) {
      console.error("Failed to fetch opening name:", error);
    }
  };

  const onPieceDrop = ({ sourceSquare, targetSquare }: { piece: DraggingPieceDataType; sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) return false;
    
    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // always promote to a queen for simplicity
    };

    const newGame = new Chess(game.fen());
    const result = newGame.move(move);

    if (result === null) {
      return false;
    }

    setFen(newGame.fen());
    makeMove(result.san);
    return true;
  };

  const makeMove = async (move: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ move, aiModel, gameMode }),
      });

      const data = await response.json();

      if (response.ok) {
        setFen(data.fen);
        setPgn(data.pgn);
        if (data.reasoning) {
          setAiReasoning(data.reasoning);
        }
        const newGame = new Chess();
        newGame.loadPgn(data.pgn);
        setGame(newGame);
      } else {
        setErrorCount(data.errorCount);
        if (data.reasoning) {
          setAiReasoning(data.reasoning);
        }
      }
    } catch (error) {
      console.error("Failed to make move:", error);
    }
  };

  const handleNewGame = async (mode: "human-vs-ai" | "ai-vs-ai") => {
    try {
      await fetch(`${API_BASE_URL}/reset`, { method: "POST" });
      setAiReasoning("");
      setOpening("");
      setGameMode(mode);
      fetchGameState();

      if (mode === "ai-vs-ai") {
        // Start the AI vs AI game
        fetch(`${API_BASE_URL}/ai-move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aiModel, gameMode: "ai-vs-ai" }),
        });
      }
    } catch (error) {
      console.error("Failed to start new game:", error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <div className="w-full lg:w-1/2">
          <Chessboard options={{ position: fen, onPieceDrop: onPieceDrop }} />
        </div>
        <div className="w-full lg:w-1/2 lg:pl-8">
          <h1 className="text-4xl font-bold mb-4">Chess LLM</h1>
          <div className="flex space-x-2 mb-4">
            <Button onClick={() => handleNewGame("human-vs-ai")}>
              Human vs AI
            </Button>
            <Button onClick={() => handleNewGame("ai-vs-ai")}>AI vs AI</Button>
            <Select value={aiModel} onValueChange={setAiModel}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select AI Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-1.5-pro-latest">Gemini 1.5 Pro</SelectItem>
                <SelectItem value="gemini-1.5-flash-latest">Gemini 1.5 Flash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <h2 className="text-xl font-semibold">AI Reasoning</h2>
            <p>{aiReasoning || "Waiting for AI..."}</p>
          </div>
          <div className="mt-4">
            <h2 className="text-xl font-semibold">Game Info</h2>
            <p>
              <strong>Opening:</strong> {opening || "N/A"}
            </p>
            <p>
              <strong>Errors:</strong> {errorCount}
            </p>
            <p>
              <strong>Turn:</strong> {game.turn() === "w" ? "White" : "Black"}
            </p>
            {(game.isGameOver() || isLoss) && (
              <p className="text-2xl font-bold text-red-500">Game Over</p>
            )}
          </div>
          <div className="mt-4 h-64 overflow-y-auto bg-gray-100 p-4 rounded-lg">
            <h2 className="text-xl font-semibold">PGN</h2>
            <pre>{pgn}</pre>
          </div>
        </div>
      </div>
    </main>
  );
}