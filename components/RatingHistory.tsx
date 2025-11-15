"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Activity } from "lucide-react";

interface EloHistory {
  id: number;
  new_elo: number;
  elo_change: number;
  created_at: number;
  result: string;
}

interface Props {
  playerId: string;
  playerName: string;
}

export function RatingHistory({ playerId, playerName }: Props) {
  const [history, setHistory] = useState<EloHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [playerId]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/player/${playerId}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to fetch rating history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-green-400" />
          Rating History
        </h2>
        <div className="text-center text-gray-400 py-8">Loading...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-green-400" />
          Rating History - {playerName}
        </h2>
        <div className="text-center text-gray-400 py-8">
          No rating history yet
        </div>
      </div>
    );
  }

  // Prepare data for chart (reverse to show oldest to newest)
  const chartData = [...history].reverse();
  const ratings = chartData.map(h => h.new_elo);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const ratingRange = maxRating - minRating || 100;

  // SVG dimensions
  const width = 600;
  const height = 200;
  const padding = 40;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  // Calculate points for the line chart
  const points = chartData.map((entry, index) => {
    const x = padding + (index / (chartData.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((entry.new_elo - minRating) / ratingRange) * chartHeight;
    return { x, y, rating: entry.new_elo, change: entry.elo_change, result: entry.result };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
        <Activity className="w-6 h-6 text-green-400" />
        Rating History - {playerName}
      </h2>

      <div className="bg-slate-900 p-4 rounded-lg">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding + chartHeight * (1 - ratio);
            const rating = Math.round(minRating + ratingRange * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#374151"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 10}
                  y={y + 5}
                  textAnchor="end"
                  fill="#9CA3AF"
                  fontSize="12"
                >
                  {rating}
                </text>
              </g>
            );
          })}

          {/* Main line */}
          <path
            d={pathData}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Gradient for line */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>

          {/* Data points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill={point.change > 0 ? "#10B981" : point.change < 0 ? "#EF4444" : "#6B7280"}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:r-7 transition-all"
              >
                <title>
                  Rating: {point.rating} ({point.change > 0 ? '+' : ''}{point.change})
                  {'\n'}Result: {point.result}
                </title>
              </circle>
            </g>
          ))}
        </svg>
      </div>

      {/* Recent changes summary */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="bg-slate-700/50 p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Current</div>
          <div className="text-xl font-bold text-white">{ratings[ratings.length - 1]}</div>
        </div>
        <div className="bg-slate-700/50 p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Highest</div>
          <div className="text-xl font-bold text-green-400">{maxRating}</div>
        </div>
        <div className="bg-slate-700/50 p-3 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Change</div>
          <div className={`text-xl font-bold ${
            ratings[ratings.length - 1] - ratings[0] > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {ratings[ratings.length - 1] - ratings[0] > 0 ? '+' : ''}
            {ratings[ratings.length - 1] - ratings[0]}
          </div>
        </div>
      </div>
    </div>
  );
}
