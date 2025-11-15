"use client";

import { X, Trophy, TrendingUp, TrendingDown, Minus, Target, Flame } from "lucide-react";
import { RatingHistory } from "./RatingHistory";

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

interface Props {
  player: Player | null;
  onClose: () => void;
}

export function PlayerStatsModal({ player, onClose }: Props) {
  if (!player) return null;

  const winRate = player.games_played > 0
    ? Math.round((player.wins / player.games_played) * 100)
    : 0;

  const avgMovesPerGame = player.games_played > 0
    ? Math.round(player.total_moves / player.games_played)
    : 0;

  const accuracy = player.total_moves > 0
    ? Math.round(((player.total_moves - player.illegal_moves) / player.total_moves) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700 p-6 border-b border-slate-600 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              {player.display_name}
            </h2>
            <p className="text-gray-400 mt-1">{player.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-600 transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 p-4 rounded-xl border border-blue-600/30">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Trophy className="w-5 h-5" />
                <span className="text-sm font-medium">Current ELO</span>
              </div>
              <div className="text-3xl font-bold text-white">{player.elo_rating}</div>
            </div>

            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 p-4 rounded-xl border border-green-600/30">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Flame className="w-5 h-5" />
                <span className="text-sm font-medium">Peak ELO</span>
              </div>
              <div className="text-3xl font-bold text-white">{player.peak_elo}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 p-4 rounded-xl border border-purple-600/30">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Target className="w-5 h-5" />
                <span className="text-sm font-medium">Win Rate</span>
              </div>
              <div className="text-3xl font-bold text-white">{winRate}%</div>
            </div>

            <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 p-4 rounded-xl border border-orange-600/30">
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-medium">Accuracy</span>
              </div>
              <div className="text-3xl font-bold text-white">{accuracy}%</div>
            </div>
          </div>

          {/* Game Statistics */}
          <div className="bg-slate-700/50 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-4">Game Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Total Games</div>
                <div className="text-2xl font-bold text-white">{player.games_played}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Wins</div>
                <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {player.wins}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Losses</div>
                <div className="text-2xl font-bold text-red-400 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  {player.losses}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Draws</div>
                <div className="text-2xl font-bold text-gray-400 flex items-center gap-2">
                  <Minus className="w-5 h-5" />
                  {player.draws}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Avg Moves/Game</div>
                <div className="text-2xl font-bold text-blue-400">{avgMovesPerGame}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Illegal Moves</div>
                <div className="text-2xl font-bold text-red-400">{player.illegal_moves}</div>
              </div>
            </div>
          </div>

          {/* Win/Loss Distribution */}
          <div className="bg-slate-700/50 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-4">Performance Distribution</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-green-400">Wins ({winRate}%)</span>
                  <span className="text-white">{player.wins}/{player.games_played}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-600 to-green-400 h-3 rounded-full transition-all"
                    style={{ width: `${winRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-red-400">Losses ({player.games_played > 0 ? Math.round((player.losses / player.games_played) * 100) : 0}%)</span>
                  <span className="text-white">{player.losses}/{player.games_played}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-red-600 to-red-400 h-3 rounded-full transition-all"
                    style={{ width: `${player.games_played > 0 ? (player.losses / player.games_played) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Draws ({player.games_played > 0 ? Math.round((player.draws / player.games_played) * 100) : 0}%)</span>
                  <span className="text-white">{player.draws}/{player.games_played}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-gray-600 to-gray-400 h-3 rounded-full transition-all"
                    style={{ width: `${player.games_played > 0 ? (player.draws / player.games_played) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rating History Chart */}
          <RatingHistory playerId={player.id} playerName={player.display_name} />
        </div>
      </div>
    </div>
  );
}
