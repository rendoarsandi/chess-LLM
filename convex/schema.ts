import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    players: v.object({
      white: v.object({
        id: v.string(),
        model: v.optional(v.string()),
        reasoning: v.optional(v.array(v.string())),
        errors: v.optional(v.number()),
      }),
      black: v.object({
        id: v.string(),
        model: v.optional(v.string()),
        reasoning: v.optional(v.array(v.string())),
        errors: v.optional(v.number()),
      }),
    }),
    pgn: v.string(),
    fen: v.string(),
    status: v.string(),
    winner: v.optional(v.string()),
    opening: v.optional(
      v.object({
        name: v.string(),
        url: v.string(),
      })
    ),
  }),
  crons: defineTable({
    gameId: v.id("games"),
  }),
});