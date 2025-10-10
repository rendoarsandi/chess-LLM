import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { Chess, Square } from "chess.js";
import { ChessGame } from "./lib/chess";
import { findReference } from "./lib/openings";
import { getModel, getModelInfo } from "./lib/ai";

export const find = query({
  args: {
    id: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.id);
    if (!game) {
      return null;
    }
    const { pgn, ...rest } = game;
    const chess = new Chess();
    if (pgn) {
      chess.loadPgn(pgn);
    }
    return {
      ...rest,
      fen: chess.fen(),
      pgn: chess.pgn(),
      isGameOver: chess.isGameOver(),
      turn: chess.turn(),
    };
  },
});

export const create = mutation({
  args: {
    white: v.optional(v.string()),
    black: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const game = new ChessGame();
    const gameId = await ctx.db.insert("games", {
      pgn: game.pgn(),
      fen: game.fen(),
      status: "in_progress",
      players: {
        white: {
          id: args.white ?? "human",
          model: args.white ? getModelInfo(args.white)?.name : "Human",
          errors: 0,
          reasoning: [],
        },
        black: {
          id: args.black ?? "human",
          model: args.black ? getModelInfo(args.black)?.name : "Human",
          errors: 0,
          reasoning: [],
        },
      },
    });
    await ctx.scheduler.runAfter(0, internal.games.takeTurn, {
      gameId,
    });
    return gameId;
  },
});

export const move = mutation({
  args: {
    id: v.id("games"),
    from: v.string(),
    to: v.string(),
    promotion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.id);
    if (!game) {
      throw new Error("Game not found");
    }
    const chess = new ChessGame(game.pgn);
    const turn = chess.turn();
    const player =
      turn === "w" ? game.players?.white : game.players?.black;
    if (player?.id !== "human") {
      throw new Error("It's not your turn");
    }
    const move = chess.move({
      from: args.from as Square,
      to: args.to as Square,
      promotion: args.promotion,
    });
    if (move === null) {
      throw new Error("Invalid move");
    }
    await ctx.db.patch(args.id, {
      pgn: chess.pgn(),
      fen: chess.fen(),
    });
    await ctx.scheduler.runAfter(0, internal.games.takeTurn, {
      gameId: args.id,
    });
  },
});

export const takeTurn = internal.action({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.runQuery(internal.games.get, {
      id: args.gameId,
    });
    if (game === null) {
      return;
    }
    if (game.status !== "in_progress") {
      return;
    }
    const chess = new Chess(game.pgn);
    if (chess.isGameOver()) {
      await ctx.runMutation(internal.games.updateStatus, {
        gameId: args.gameId,
        fen: chess.fen(),
      });
      return;
    }
    const turn = chess.turn();
    const player =
      turn === "w" ? game.players?.white : game.players?.black;
    if (!player || player.id === "human") {
      return;
    }
    let reference;
    let opening;
    if (chess.history().length < 10) {
      try {
        const result = await findReference(chess);
        reference = result.reference;
        opening = result.opening;
      } catch (error) {
        console.error(error);
      }
    }
    const model = getModel(player.id);
    const { move, reasoning } = await model.getBestMove(chess, reference);
    await ctx.runMutation(internal.games.makeMove, {
      gameId: args.gameId,
      move,
      reasoning,
      opening: opening,
      error: move === "error",
    });
    if (move !== "error") {
      await ctx.scheduler.runAfter(0, internal.games.takeTurn, {
        gameId: args.gameId,
      });
    }
  },
});

export const makeMove = internalMutation({
  args: {
    gameId: v.id("games"),
    move: v.string(),
    reasoning: v.array(v.string()),
    opening: v.optional(
      v.object({
        name: v.string(),
        url: v.string(),
      })
    ),
    error: v.boolean(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return;
    }
    const chess = new ChessGame(game.pgn);
    const turn = chess.turn();
    const player =
      turn === "w" ? game.players?.white : game.players?.black;
    if (!player) {
      return;
    }
    if (args.error) {
      const errors = (player.errors ?? 0) + 1;
      if (errors >= 5) {
        await ctx.db.patch(args.gameId, {
          status: "game_over",
          winner: turn === "w" ? "b" : "w",
        });
      } else {
        await ctx.db.patch(args.gameId, {
          players: {
            ...game.players,
            [turn === "w" ? "white" : "black"]: {
              ...player,
              errors,
            },
          },
        });
      }
      return;
    }
    const move = chess.move(args.move);
    if (move === null) {
      console.error("Invalid move", { gameId: args.gameId, move: args.move });
      return;
    }
    const patch: Partial<typeof game> & { pgn: string; fen: string } = {
      pgn: chess.pgn(),
      fen: chess.fen(),
      players: {
        ...game.players,
        [turn === "w" ? "white" : "black"]: {
          ...player,
          reasoning: args.reasoning,
        },
      },
    };
    if (args.opening) {
      patch.opening = args.opening;
    }
    await ctx.db.patch(args.gameId, patch);
  },
});

export const get = internalQuery({
  args: {
    id: v.id("games"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateStatus = internalMutation({
  args: {
    gameId: v.id("games"),
    fen: v.string(),
  },
  handler: async (ctx, args) => {
    const chess = new Chess(args.fen);
    if (!chess.isGameOver()) {
      return;
    }
    let winner;
    if (chess.isCheckmate()) {
      winner = chess.turn() === "w" ? "b" : "w";
    }
    await ctx.db.patch(args.gameId, {
      status: "game_over",
      winner,
    });
  },
});

export const backfill = internal.action({
  args: {
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.secret !== process.env.CRON_SECRET) {
      return;
    }
    const games = await ctx.runQuery(internal.games.getInProgress);
    for (const game of games) {
      await ctx.scheduler.runAfter(0, internal.games.takeTurn, {
        gameId: game._id,
      });
    }
  },
});

export const getInProgress = internalQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("games")
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .collect();
  },
});