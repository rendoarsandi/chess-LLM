import * as schema from './schema'
import { createDrizzleDatabase } from './driver'
import { createSqliteClient } from './sqlite'

const SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 1200,
    rating960 INTEGER NOT NULL DEFAULT 1200,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    wins960 INTEGER NOT NULL DEFAULT 0,
    losses960 INTEGER NOT NULL DEFAULT 0,
    draws960 INTEGER NOT NULL DEFAULT 0,
    peak_rating INTEGER NOT NULL DEFAULT 1200,
    peak_rating960 INTEGER NOT NULL DEFAULT 1200,
    version TEXT,
    provider TEXT,
    bio TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    start_time INTEGER NOT NULL,
    time_control_settings TEXT,
    current_round INTEGER NOT NULL DEFAULT 0,
    total_rounds INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
  CREATE TABLE IF NOT EXISTS tournament_participants (
    tournament_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    buchholz INTEGER NOT NULL DEFAULT 0,
    joined_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (tournament_id, player_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
  );
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    white_player_id TEXT NOT NULL,
    black_player_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ongoing',
    variant TEXT NOT NULL DEFAULT 'standard',
    start_pos_id INTEGER,
    fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    winner_id TEXT,
    game_over_reason TEXT,
    pgn TEXT,
    tournament_id TEXT,
    round_number INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (white_player_id) REFERENCES players(id),
    FOREIGN KEY (black_player_id) REFERENCES players(id)
  );
  CREATE TABLE IF NOT EXISTS rating_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    game_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (game_id) REFERENCES games(id)
  );
  CREATE TABLE IF NOT EXISTS moves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    move_number INTEGER NOT NULL,
    player_color TEXT NOT NULL,
    move TEXT NOT NULL,
    fen TEXT NOT NULL,
    opening TEXT,
    candidates TEXT,
    reasoning TEXT,
    thinking_ms INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (game_id) REFERENCES games(id)
  );
  CREATE TABLE IF NOT EXISTS game_reviews (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    progress_current INTEGER NOT NULL DEFAULT 0,
    progress_total INTEGER NOT NULL DEFAULT 0,
    started_at INTEGER,
    worker_id TEXT,
    last_heartbeat INTEGER,
    completed_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (game_id) REFERENCES games(id)
  );
  CREATE TABLE IF NOT EXISTS move_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id TEXT NOT NULL,
    move_number INTEGER NOT NULL,
    player_color TEXT NOT NULL,
    classification TEXT NOT NULL,
    evaluation TEXT NOT NULL,
    best_line TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (review_id) REFERENCES game_reviews(id)
  );
  CREATE TABLE IF NOT EXISTS llm_configurations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT,
    provider TEXT NOT NULL,
    model_id TEXT NOT NULL,
    api_key TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_hardcoded INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (player_id) REFERENCES players(id)
  );
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    email_verified INTEGER NOT NULL,
    image TEXT,
    role TEXT,
    banned INTEGER,
    ban_reason TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
  );
  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at INTEGER,
    refresh_token_expires_at INTEGER,
    scope TEXT,
    password TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
  );
`

export function createInMemoryDb() {
  const sqlite = createSqliteClient(':memory:')
  sqlite.pragma('foreign_keys = ON')
  sqlite.exec(SCHEMA_DDL)
  const db = createDrizzleDatabase<typeof schema>(sqlite, { schema })

  return { sqlite, db }
}
