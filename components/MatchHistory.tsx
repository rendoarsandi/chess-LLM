"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Calendar, Trophy } from "lucide-react";

interface MatchHistory {
  id: string;
  pgn: string;
  result: string;
  game_mode: string;
  ai_model: string;
  total_moves: number;
  created_at: number;
  white_player?: string;
  black_player?: string;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getResultBadge(result: string) {
  switch (result) {
    case 'white_win':
      return { text: '⚪ White wins', color: 'bg-gray-200 text-gray-900' };
    case 'black_win':
      return { text: '⚫ Black wins', color: 'bg-gray-800 text-white' };
    case 'draw':
      return { text: '🤝 Draw', color: 'bg-yellow-600 text-white' };
    default:
      return { text: '⏳ Ongoing', color: 'bg-blue-600 text-white' };
  }
}

export function MatchHistory() {
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatchHistory();

    // Refresh every 15 seconds
    const interval = setInterval(fetchMatchHistory, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchMatchHistory = async () => {
    try {
      const response = await fetch("/api/match-history");
      if (response.ok) {
        const data = await response.json();
        setMatches(data);
      }
    } catch (error) {
      console.error("Failed to fetch match history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-400" />
          Recent Matches
        </h2>
        <div className="text-center text-gray-400 py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
        <Calendar className="w-6 h-6 text-blue-400" />
        Recent Matches
      </h2>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {matches.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No matches yet. Start playing!
          </div>
        ) : (
          matches.map((match) => {
            const resultBadge = getResultBadge(match.result);

            return (
              <div
                key={match.id}
                className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:bg-slate-700 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${resultBadge.color}`}>
                        {resultBadge.text}
                      </span>
                      {match.game_mode === 'ai-vs-ai' && (
                        <span className="px-2 py-1 rounded text-xs bg-purple-600/30 text-purple-300">
                          🤖 AI Battle
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-300">
                      {match.total_moves} moves • {formatTimeAgo(match.created_at)}
                    </div>
                  </div>
                </div>

                {match.game_mode === 'ai-vs-ai' && match.white_player && match.black_player && (
                  <div className="mt-2 pt-2 border-t border-slate-600 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>⚪ {match.white_player}</span>
                      <span className="text-gray-500">vs</span>
                      <span>⚫ {match.black_player}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {matches.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-xs text-gray-400 text-center">
            Showing last {matches.length} matches
          </div>
        </div>
      )}
    </div>
  );
}
