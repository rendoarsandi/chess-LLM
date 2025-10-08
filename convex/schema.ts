import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    // Game metadata
    mode: v.string(), // "human-vs-ai" | "ai-vs-ai"
    status: v.string(), // "waiting" | "in-progress" | "completed" | "aborted"
    
    // Players
    whitePlayer: v.string(), // "human" | "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite"
    blackPlayer: v.string(), // "human" | "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite"
    
    // Game state
    fen: v.string(), // Current FEN position
    pgn: v.string(), // Full PGN of the game
    currentTurn: v.string(), // "white" | "black"
    
    // Move tracking
    moveCount: v.number(),
    whiteIllegalMoves: v.number(),
    blackIllegalMoves: v.number(),
    
    // Game result
    result: v.optional(v.string()), // "1-0" | "0-1" | "1/2-1/2"
    resultReason: v.optional(v.string()), // "checkmate" | "stalemate" | "illegal-moves" | "resignation" | "draw"
    winner: v.optional(v.string()), // "white" | "black" | "draw"
    
    // Opening information
    openingName: v.optional(v.string()),
    openingEco: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_mode", ["mode"])
    .index("by_created", ["createdAt"]),

  moves: defineTable({
    gameId: v.id("games"),
    moveNumber: v.number(),
    color: v.string(), // "white" | "black"
    
    // Move details
    from: v.string(),
    to: v.string(),
    piece: v.string(),
    san: v.string(), // Standard Algebraic Notation
    
    // Position before and after
    fenBefore: v.string(),
    fenAfter: v.string(),
    
    // AI reasoning (if applicable)
    aiModel: v.optional(v.string()),
    reasoning: v.optional(v.string()),
    evaluation: v.optional(v.string()),
    alternativeMoves: v.optional(v.array(v.string())),
    
    // Timing
    thinkingTime: v.optional(v.number()), // milliseconds
    timestamp: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_and_move", ["gameId", "moveNumber"]),

  illegalMoves: defineTable({
    gameId: v.id("games"),
    color: v.string(), // "white" | "black"
    attemptedMove: v.string(),
    error: v.string(),
    fen: v.string(),
    aiModel: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_game", ["gameId"]),
});

