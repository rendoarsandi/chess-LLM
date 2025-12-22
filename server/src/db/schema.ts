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
  tournamentId: text('tournament_id').references(() => tournaments.id),
  roundNumber: integer('round_number'),
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

export const gameReviews = sqliteTable('game_reviews', {
  id: text('id').primaryKey(), // UUID
  gameId: text('game_id').references(() => games.id).notNull(),
  status: text('status', { enum: ['queued', 'processing', 'completed', 'failed'] }).default('queued').notNull(),
  progressCurrent: integer('progress_current').default(0).notNull(),
  progressTotal: integer('progress_total').default(0).notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  workerId: text('worker_id'),
  lastHeartbeat: integer('last_heartbeat', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
})

export const moveAnalyses = sqliteTable('move_analyses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reviewId: text('review_id').references(() => gameReviews.id).notNull(),
  moveNumber: integer('move_number').notNull(),
  classification: text('classification').notNull(),
  evaluation: text('evaluation').notNull(),
  bestLine: text('best_line'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  reviewIdx: index('review_idx').on(table.reviewId),
}))

export const llmConfigurations = sqliteTable('llm_configurations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: text('player_id').references(() => players.id), // UUID of the instantiated player
  provider: text('provider').notNull(), // e.g., 'gemini', 'groq'
  modelId: text('model_id').notNull(), // e.g., 'gemini-1.5-pro'
  apiKey: text('api_key'), // Optional if stored in env
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  isHardcoded: integer('is_hardcoded', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
})

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  role: text("role"),
  banned: integer("banned", { mode: "boolean" }),
  banReason: text("ban_reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
})

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const tournaments = sqliteTable('tournaments', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  status: text('status', { enum: ['scheduled', 'active', 'completed'] }).default('scheduled').notNull(),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  timeControlSettings: text('time_control_settings'), // JSON string or simple text
  currentRound: integer('current_round').default(0).notNull(),
  totalRounds: integer('total_rounds').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
})

export const tournamentParticipants = sqliteTable('tournament_participants', {
  tournamentId: text('tournament_id').references(() => tournaments.id).notNull(),
  playerId: text('player_id').references(() => players.id).notNull(),
  score: integer('score').default(0).notNull(), // Multiplied by 10 to handle 0.5 as 5
  buchholz: integer('buchholz').default(0).notNull(),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  pk: index('tournament_participants_pk').on(table.tournamentId, table.playerId),
}))

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
})