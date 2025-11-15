-- Migration: Add ELO Ranking System
-- This migration adds tables for tracking AI player ELO ratings and match history

-- AI Players table with ELO ratings
CREATE TABLE ai_players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  model_version TEXT,
  elo_rating INTEGER DEFAULT 1600,
  peak_elo INTEGER DEFAULT 1600,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  total_moves INTEGER DEFAULT 0,
  illegal_moves INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ELO history for tracking rating changes over time
CREATE TABLE elo_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ai_player_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  previous_elo INTEGER NOT NULL,
  new_elo INTEGER NOT NULL,
  elo_change INTEGER NOT NULL,
  opponent_id TEXT,
  opponent_elo INTEGER,
  player_color TEXT NOT NULL,
  result TEXT NOT NULL,
  k_factor INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (ai_player_id) REFERENCES ai_players(id),
  FOREIGN KEY (opponent_id) REFERENCES ai_players(id),
  FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Index for faster queries
CREATE INDEX idx_elo_history_player ON elo_history(ai_player_id);
CREATE INDEX idx_elo_history_game ON elo_history(game_id);
CREATE INDEX idx_ai_players_elo ON ai_players(elo_rating DESC);

-- AI vs AI matchup statistics
CREATE TABLE ai_matchups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player1_id TEXT NOT NULL,
  player2_id TEXT NOT NULL,
  games_played INTEGER DEFAULT 0,
  player1_wins INTEGER DEFAULT 0,
  player2_wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  last_game_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(player1_id, player2_id),
  FOREIGN KEY (player1_id) REFERENCES ai_players(id),
  FOREIGN KEY (player2_id) REFERENCES ai_players(id),
  FOREIGN KEY (last_game_id) REFERENCES games(id)
);

-- Insert default AI players with starting ELO of 1600
INSERT INTO ai_players (id, name, display_name, model_version, elo_rating, peak_elo, created_at, updated_at) VALUES
  ('gemini-1.5-flash', 'gemini-1.5-flash', 'Gemini 1.5 Flash', 'gemini-1.5-flash-latest', 1600, 1600, unixepoch(), unixepoch()),
  ('gemini-1.5-pro', 'gemini-1.5-pro', 'Gemini 1.5 Pro', 'gemini-1.5-pro-latest', 1600, 1600, unixepoch(), unixepoch());
