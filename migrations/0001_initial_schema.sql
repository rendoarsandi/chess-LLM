-- Create games table to store game history
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  pgn TEXT NOT NULL,
  fen TEXT NOT NULL,
  result TEXT, -- 'white_win', 'black_win', 'draw', 'ongoing'
  game_mode TEXT NOT NULL, -- 'human-vs-ai', 'ai-vs-ai'
  ai_model TEXT NOT NULL,
  player_color TEXT, -- 'white', 'black' for human-vs-ai mode
  error_count INTEGER DEFAULT 0,
  total_moves INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);

-- Create moves table to store individual moves
CREATE TABLE IF NOT EXISTS moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  move_number INTEGER NOT NULL,
  move_san TEXT NOT NULL, -- Standard Algebraic Notation
  move_from TEXT NOT NULL,
  move_to TEXT NOT NULL,
  player TEXT NOT NULL, -- 'white', 'black'
  is_ai_move BOOLEAN NOT NULL,
  ai_reasoning TEXT,
  fen_after_move TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_games_result ON games(result);
CREATE INDEX IF NOT EXISTS idx_games_game_mode ON games(game_mode);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_created_at ON moves(created_at);

-- Create table for AI performance metrics
CREATE TABLE IF NOT EXISTS ai_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  illegal_move_count INTEGER DEFAULT 0,
  average_response_time REAL,
  total_moves INTEGER DEFAULT 0,
  win_loss_draw TEXT, -- 'win', 'loss', 'draw', 'ongoing'
  created_at INTEGER NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_game_id ON ai_metrics(game_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_model ON ai_metrics(ai_model);
