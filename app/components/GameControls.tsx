"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const AI_MODELS = ["2.5-flash", "2.5-flash-lite", "2.5-pro"];

type PlayerType = "human" | "ai";
type AiModel = "2.5-flash" | "2.5-flash-lite" | "2.5-pro";

export default function GameControls({ setGameId }: { setGameId: (id: Id<"games">) => void }) {
  const createGame = useMutation(api.games.createGame);
  const [p1Type, setP1Type] = useState<PlayerType>("human");
  const [p2Type, setP2Type] = useState<PlayerType>("ai");
  const [p1Model, setP1Model] = useState<AiModel>("2.5-flash");
  const [p2Model, setP2Model] = useState<AiModel>("2.5-flash");

  const handleCreateGame = async () => {
    const gameId = await createGame({
      player1Type: p1Type,
      player1Model: p1Type === "ai" ? p1Model : undefined,
      player2Type: p2Type,
      player2Model: p2Type === "ai" ? p2Model : undefined,
    });
    setGameId(gameId);
  };

  const Selector = ({ value, onChange, options, disabled }: any) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {options.map((option: string) => (
        <option key={option} value={option}>
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Game Controls</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="font-semibold">Player 1 (White)</label>
          <div className="flex gap-2">
            <Selector value={p1Type} onChange={setP1Type} options={["human", "ai"]} />
            <Selector value={p1Model} onChange={setP1Model} options={AI_MODELS} disabled={p1Type !== 'ai'} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="font-semibold">Player 2 (Black)</label>
          <div className="flex gap-2">
            <Selector value={p2Type} onChange={setP2Type} options={["human", "ai"]} />
            <Selector value={p2Model} onChange={setP2Model} options={AI_MODELS} disabled={p2Type !== 'ai'} />
          </div>
        </div>
        <button
          onClick={handleCreateGame}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors duration-200"
        >
          Create New Game
        </button>
      </div>
    </div>
  );
}
