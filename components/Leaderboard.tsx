"use client";

import { useState, useEffect } from "react";
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Star, Award } from "lucide-react";
import { PlayerStatsModal } from "./PlayerStatsModal";

interface Player {
  id: string;
  name: string;
  display_name: string;
  elo_rating: number;
  peak_elo: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  total_moves: number;
  illegal_moves: number;
}

function getRatingBadge(rating: number) {
  if (rating >= 2400) {
    return { icon: <Crown className="w-4 h-4" />, color: "text-yellow-400", label: "GM", bg: "bg-yellow-900/30" };
  } else if (rating >= 2200) {
    return { icon: <Star className="w-4 h-4" />, color: "text-purple-400", label: "Master", bg: "bg-purple-900/30" };
  } else if (rating >= 2000) {
    return { icon: <Award className="w-4 h-4" />, color: "text-blue-400", label: "Expert", bg: "bg-blue-900/30" };
  } else if (rating >= 1800) {
    return { icon: <TrendingUp className="w-4 h-4" />, color: "text-green-400", label: "Advanced", bg: "bg-green-900/30" };
  }
  return { icon: <Minus className="w-4 h-4" />, color: "text-gray-400", label: "Intermediate", bg: "bg-gray-900/30" };
}

function getWinRate(player: Player): number {
  if (player.games_played === 0) return 0;
  return Math.round((player.wins / player.games_played) * 100);
}

export function Leaderboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [refreshKey]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch("/api/leaderboard");
      if (response.ok) {
        const data = await response.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          ELO Rankings
        </h2>
        <div className="text-center text-gray-400 py-8">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          ELO Rankings
        </h2>

        <div className="space-y-3">
        {players.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No players yet. Start playing to see rankings!
          </div>
        ) : (
          players.map((player, index) => {
            const badge = getRatingBadge(player.elo_rating);
            const winRate = getWinRate(player);

            return (
              <div
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className={`p-4 rounded-lg transition-all hover:scale-[1.02] cursor-pointer ${
                  index === 0
                    ? "bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 border-2 border-yellow-600/50"
                    : index === 1
                    ? "bg-gradient-to-r from-gray-700/40 to-gray-600/20 border-2 border-gray-500/50"
                    : index === 2
                    ? "bg-gradient-to-r from-orange-900/40 to-orange-800/20 border-2 border-orange-600/50"
                    : "bg-slate-700/50 border border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Rank & Name */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`text-2xl font-bold ${
                      index === 0 ? "text-yellow-400" :
                      index === 1 ? "text-gray-300" :
                      index === 2 ? "text-orange-400" :
                      "text-gray-500"
                    }`}>
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-lg">
                          {player.display_name}
                        </span>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${badge.bg} ${badge.color}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {player.games_played} games • {winRate}% win rate
                      </div>
                    </div>
                  </div>

                  {/* ELO Rating */}
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">
                      {player.elo_rating}
                    </div>
                    {player.peak_elo > player.elo_rating && (
                      <div className="text-xs text-gray-400">
                        Peak: {player.peak_elo}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="mt-3 flex gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">{player.wins}W</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">{player.losses}L</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Minus className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-400">{player.draws}D</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

        {players.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="text-xs text-gray-400 text-center">
              Rankings update automatically every 10 seconds
              <br />
              Click on a player to view detailed stats
            </div>
          </div>
        )}
      </div>

      <PlayerStatsModal
        player={selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </>
  );
}
