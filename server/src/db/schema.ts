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
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
})

export const games = sqliteTable('games', {
  id: text('id').primaryKey(), // UUID
  whitePlayerId: text('white_player_id').references(() => players.id).notNull(),
  blackPlayerId: text('black_player_id').references(() => players.id).notNull(),
  status: text('status', { enum: ['ongoing', 'completed', 'draw', 'paused'] }).default('ongoing').notNull(),
  fen: text('fen').default('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1').notNull(),
  winnerId: text('winner_id').references(() => players.id),
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
