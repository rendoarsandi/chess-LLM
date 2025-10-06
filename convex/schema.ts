import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    pgn: v.string(),
    fen: v.string(),
    status: v.union(
      v.literal("in_progress"),
      v.literal("checkmate"),
      v.literal("stalemate"),
      v.literal("draw"),
      v.literal("illegal_move_loss")
    ),
    turn: v.union(v.literal("w"), v.literal("b")),
    player1: v.object({
      type: v.union(v.literal("human"), v.literal("ai")),
      color: v.literal("w"),
      model: v.optional(v.union(v.literal("2.5-pro"), v.literal("2.5-flash"), v.literal("2.5-flash-lite"))),
    }),
    player2: v.object({
      type: v.union(v.literal("human"), v.literal("ai")),
      color: v.literal("b"),
      model: v.optional(v.union(v.literal("2.5-pro"), v.literal("2.5-flash"), v.literal("2.5-flash-lite"))),
    }),
    winner: v.optional(v.union(v.literal("w"), v.literal("b"), v.literal("draw"))),
    aiReasoning: v.optional(v.string()),
    openingName: v.optional(v.string()),
    illegalMoveCounter: v.object({
      w: v.number(),
      b: v.number(),
    }),
  }),
});
