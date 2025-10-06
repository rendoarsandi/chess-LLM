"use client";

import { useState } from 'react';
import { Id } from '@/convex/_generated/dataModel';
import ChessboardComponent from './components/ChessboardComponent';
import GameControls from './components/GameControls';
import InfoPanel from './components/InfoPanel';

export default function Home() {
  const [gameId, setGameId] = useState<Id<"games"> | null>(null);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-gray-900 text-white">
      <div className="w-full max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold">Chess LLM</h1>
          <p className="text-gray-400">AI vs AI Chess powered by Gemini</p>
        </header>

        {!gameId && (
          <div className="w-full max-w-md mx-auto">
             <GameControls setGameId={setGameId} />
          </div>
        )}

        {gameId && (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:flex-grow">
              <ChessboardComponent gameId={gameId} />
            </div>
            <aside className="w-full lg:w-96 lg:max-w-sm flex-shrink-0">
              <InfoPanel gameId={gameId} />
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
