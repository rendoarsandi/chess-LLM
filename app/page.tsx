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
  const [aiModel, setAiModel] = useState("gemini-1.5-flash-latest");
  const [gameMode, setGameMode] = useState("human-vs-ai");
  const [isAiThinking, setIsAiThinking] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setIsAiThinking(true);
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
    } finally {
      setIsAiThinking(false);
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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="z-10 w-full max-w-7xl">
        <h1 className="text-5xl font-bold mb-8 text-center text-white">
          Chess LLM <span className="text-blue-400">Arena</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chessboard Section */}
          <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
            <Chessboard options={{ position: fen, onPieceDrop: onPieceDrop }} />

            {/* Game Status Banner */}
            {isAiThinking && (
              <div className="mt-4 p-3 bg-blue-900 text-white rounded-lg text-center animate-pulse">
                🤖 AI is thinking...
              </div>
            )}
            {(game.isGameOver() || isLoss) && (
              <div className="mt-4 p-4 bg-red-900 text-white rounded-lg text-center text-xl font-bold">
                🏁 Game Over
                {game.isCheckmate() && <p className="text-sm mt-1">Checkmate!</p>}
                {game.isDraw() && <p className="text-sm mt-1">Draw</p>}
                {game.isStalemate() && <p className="text-sm mt-1">Stalemate</p>}
                {isLoss && <p className="text-sm mt-1">Too many errors</p>}
              </div>
            )}
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            {/* Game Controls */}
            <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
              <h2 className="text-2xl font-bold mb-4 text-white">Game Mode</h2>
              <div className="space-y-3">
                <Button
                  onClick={() => handleNewGame("human-vs-ai")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                  disabled={isAiThinking}
                >
                  👤 Human vs AI
                </Button>
                <Button
                  onClick={() => handleNewGame("ai-vs-ai")}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
                  disabled={isAiThinking}
                >
                  🤖 AI vs AI
                </Button>
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger className="w-full bg-slate-700 text-white border-slate-600">
                    <SelectValue placeholder="Select AI Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-1.5-pro-latest">Gemini 1.5 Pro</SelectItem>
                    <SelectItem value="gemini-1.5-flash-latest">Gemini 1.5 Flash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Game Info */}
            <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
              <h2 className="text-2xl font-bold mb-4 text-white">Game Info</h2>
              <div className="space-y-2 text-white">
                <div className="flex justify-between items-center p-2 bg-slate-700 rounded">
                  <span className="font-semibold">Turn:</span>
                  <span className={`font-bold ${game.turn() === "w" ? "text-gray-300" : "text-gray-700"}`}>
                    {game.turn() === "w" ? "⚪ White" : "⚫ Black"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-700 rounded">
                  <span className="font-semibold">Moves:</span>
                  <span>{Math.floor(game.history().length / 2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-700 rounded">
                  <span className="font-semibold">Opening:</span>
                  <span className="text-xs">{opening || "Starting position"}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-700 rounded">
                  <span className="font-semibold">Errors:</span>
                  <span className={errorCount > 3 ? "text-red-400 font-bold" : ""}>{errorCount}/5</span>
                </div>
              </div>
            </div>

            {/* AI Reasoning */}
            <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
              <h2 className="text-2xl font-bold mb-4 text-white">🧠 AI Analysis</h2>
              <div className="bg-slate-900 p-4 rounded-lg max-h-48 overflow-y-auto text-gray-300 text-sm leading-relaxed">
                {aiReasoning || "Waiting for AI move..."}
              </div>
            </div>
          </div>
        </div>

        {/* PGN Section */}
        <div className="mt-6 bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
          <h2 className="text-2xl font-bold mb-4 text-white">📝 Move History (PGN)</h2>
          <div className="bg-slate-900 p-4 rounded-lg max-h-32 overflow-y-auto">
            <pre className="text-gray-300 text-sm font-mono">{pgn || "No moves yet"}</pre>
          </div>
        </div>
      </div>
    </main>
  );
}