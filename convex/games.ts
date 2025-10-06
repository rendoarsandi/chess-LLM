import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Chess } from "chess.js";
import { api } from "./_generated/api";

const MAX_ILLEGAL_MOVES = 5;

export const get = query({
  args: { id: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createGame = mutation({
  args: {
    player1Type: v.union(v.literal("human"), v.literal("ai")),
    player1Model: v.optional(v.union(v.literal("2.5-pro"), v.literal("2.5-flash"), v.literal("2.5-flash-lite"))),
    player2Type: v.union(v.literal("human"), v.literal("ai")),
    player2Model: v.optional(v.union(v.literal("2.5-pro"), v.literal("2.5-flash"), v.literal("2.5-flash-lite"))),
  },
  handler: async (ctx, args) => {
    const chess = new Chess();
    const gameId = await ctx.db.insert("games", {
      fen: chess.fen(),
      pgn: chess.pgn(),
      status: "in_progress",
      turn: "w",
      player1: {
        type: args.player1Type,
        color: "w",
        model: args.player1Model,
      },
      player2: {
        type: args.player2Type,
        color: "b",
        model: args.player2Model,
      },
      illegalMoveCounter: {
        w: 0,
        b: 0,
      },
    });

    // If AI is the first player, schedule its move
    if (args.player1Type === "ai") {
      await ctx.scheduler.runAfter(0, api.ai.generateAiMove, { gameId });
    }

    return gameId;
  },
});

export const makeMove = mutation({
  args: {
    gameId: v.id("games"),
    move: v.string(),
    player: v.union(v.literal("w"), v.literal("b")),
  },
  handler: async (ctx, { gameId, move, player }) => {
    const game = await ctx.db.get(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    if (game.turn !== player) {
      throw new Error("Not your turn");
    }

    const chess = new Chess(game.fen);

    try {
      const result = chess.move(move, { sloppy: true });

      if (result === null) {
        throw new Error("Invalid move");
      }

      let status = game.status;
      let winner = game.winner;

      if (chess.isCheckmate()) {
        status = "checkmate";
        winner = chess.turn() === "b" ? "w" : "b";
      } else if (chess.isStalemate()) {
        status = "stalemate";
        winner = "draw";
      } else if (chess.isDraw()) {
        status = "draw";
        winner = "draw";
      }

      await ctx.db.patch(gameId, {
        fen: chess.fen(),
        pgn: chess.pgn(),
        turn: chess.turn(),
        status,
        winner,
        aiReasoning: undefined, // Clear previous reasoning
        openingName: undefined, // Clear previous opening name
      });

      const nextPlayer = game.turn === "w" ? game.player2 : game.player1;
      if (status === "in_progress" && nextPlayer.type === "ai") {
        await ctx.scheduler.runAfter(0, api.ai.generateAiMove, { gameId });
      }

    } catch (e) {
      const illegalMoveCounter = { ...game.illegalMoveCounter };
      illegalMoveCounter[player]++;

      if (illegalMoveCounter[player] >= MAX_ILLEGAL_MOVES) {
        await ctx.db.patch(gameId, {
          status: "illegal_move_loss",
          winner: player === "w" ? "b" : "w",
          illegalMoveCounter,
        });
      } else {
        await ctx.db.patch(gameId, { illegalMoveCounter });
      }
      // Let the client know the move was illegal
      throw new Error(`Invalid move. This is illegal move #${illegalMoveCounter[player]}.`);
    }
  },
});
