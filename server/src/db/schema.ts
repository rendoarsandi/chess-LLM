import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const players = sqliteTable('players', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  type: text('type', { enum: ['llm', 'human'] }).notNull(),
  rating: integer('rating').default(1200).notNull(),
  wins: integer('wins').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  draws: integer('draws').default(0).notNull(),
  peakRating: integer('peak_rating').default(1200).notNull(),
  version: text('version'),
  provider: text('provider'),
  bio: text('bio'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
})

export const ratingHistory = sqliteTable('rating_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: text('player_id').references(() => players.id).notNull(),
  rating: integer('rating').notNull(),
  gameId: text('game_id').references(() => games.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  playerIdx: index('player_rating_idx').on(table.playerId),
}))

export const games = sqliteTable('games', {
  id: text('id').primaryKey(), // UUID
  whitePlayerId: text('white_player_id').references(() => players.id).notNull(),
  blackPlayerId: text('black_player_id').references(() => players.id).notNull(),
  status: text('status', { enum: ['ongoing', 'completed', 'draw', 'paused'] }).default('ongoing').notNull(),
  fen: text('fen').default('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1').notNull(),
  winnerId: text('winner_id').references(() => players.id),
  gameOverReason: text('game_over_reason'), // e.g. "checkmate", "stalemate", "draw"
  pgn: text('pgn'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
})

export const moves = sqliteTable('moves', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: text('game_id').references(() => games.id).notNull(),
  moveNumber: integer('move_number').notNull(),
  playerColor: text('player_color', { enum: ['white', 'black'] }).notNull(),
  move: text('move').notNull(), // SAN notation e.g. "e4"
  fen: text('fen').notNull(), // State AFTER move
  opening: text('opening'),
  candidates: text('candidates'), // JSON string of top 3 moves
  reasoning: text('reasoning'),
  thinkingMs: integer('thinking_ms'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  gameIdx: index('game_idx').on(table.gameId),
}))

export const llmConfigurations = sqliteTable('llm_configurations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  provider: text('provider').notNull(), // e.g., 'gemini', 'groq'
  modelId: text('model_id').notNull(), // e.g., 'gemini-1.5-pro'
  apiKey: text('api_key'), // Optional if stored in env
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  isHardcoded: integer('is_hardcoded', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
})