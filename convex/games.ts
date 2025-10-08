import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Create a new game
export const createGame = mutation({
  args: {
    mode: v.string(),
    whitePlayer: v.string(),
    blackPlayer: v.string(),
  },
  handler: async (ctx, args) => {
    const gameId = await ctx.db.insert("games", {
      mode: args.mode,
      status: "waiting",
      whitePlayer: args.whitePlayer,
      blackPlayer: args.blackPlayer,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      pgn: "",
      currentTurn: "white",
      moveCount: 0,
      whiteIllegalMoves: 0,
      blackIllegalMoves: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return gameId;
  },
});

// Get a game by ID
export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

// Get all games
export const getGames = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      const games = await ctx.db
        .query("games")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(args.limit || 50);
      return games;
    } else {
      const games = await ctx.db
        .query("games")
        .withIndex("by_created")
        .order("desc")
        .take(args.limit || 50);
      return games;
    }
  },
});

// Update game state
export const updateGameState = mutation({
  args: {
    gameId: v.id("games"),
    fen: v.string(),
    pgn: v.string(),
    currentTurn: v.string(),
    moveCount: v.number(),
    status: v.optional(v.string()),
    openingName: v.optional(v.string()),
    openingEco: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { gameId, ...updates } = args;
    
    await ctx.db.patch(gameId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Record an illegal move
export const recordIllegalMove = mutation({
  args: {
    gameId: v.id("games"),
    color: v.string(),
    attemptedMove: v.string(),
    error: v.string(),
    fen: v.string(),
    aiModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Record the illegal move
    await ctx.db.insert("illegalMoves", {
      gameId: args.gameId,
      color: args.color,
      attemptedMove: args.attemptedMove,
      error: args.error,
      fen: args.fen,
      aiModel: args.aiModel,
      timestamp: Date.now(),
    });

    // Update the illegal move counter
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const illegalMoveCount = args.color === "white" 
      ? game.whiteIllegalMoves + 1 
      : game.blackIllegalMoves + 1;

    const updates: Partial<Doc<"games">> = {
      updatedAt: Date.now(),
    };

    if (args.color === "white") {
      updates.whiteIllegalMoves = illegalMoveCount;
    } else {
      updates.blackIllegalMoves = illegalMoveCount;
    }

    // Check if player has reached 5 illegal moves
    if (illegalMoveCount >= 5) {
      updates.status = "completed";
      updates.result = args.color === "white" ? "0-1" : "1-0";
      updates.resultReason = "illegal-moves";
      updates.winner = args.color === "white" ? "black" : "white";
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.gameId, updates);

    return illegalMoveCount;
  },
});

// Record a move
export const recordMove = mutation({
  args: {
    gameId: v.id("games"),
    moveNumber: v.number(),
    color: v.string(),
    from: v.string(),
    to: v.string(),
    piece: v.string(),
    san: v.string(),
    fenBefore: v.string(),
    fenAfter: v.string(),
    aiModel: v.optional(v.string()),
    reasoning: v.optional(v.string()),
    evaluation: v.optional(v.string()),
    alternativeMoves: v.optional(v.array(v.string())),
    thinkingTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { gameId, ...moveData } = args;
    
    await ctx.db.insert("moves", {
      gameId,
      ...moveData,
      timestamp: Date.now(),
    });
  },
});

// Get moves for a game
export const getMoves = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("moves")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("asc")
      .collect();
  },
});

// Get illegal moves for a game
export const getIllegalMoves = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("illegalMoves")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("asc")
      .collect();
  },
});

// Complete a game
export const completeGame = mutation({
  args: {
    gameId: v.id("games"),
    result: v.string(),
    resultReason: v.string(),
    winner: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gameId, {
      status: "completed",
      result: args.result,
      resultReason: args.resultReason,
      winner: args.winner,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Start a game
export const startGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gameId, {
      status: "in-progress",
      updatedAt: Date.now(),
    });
  },
});

// Abort a game
export const abortGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gameId, {
      status: "aborted",
      updatedAt: Date.now(),
    });
  },
});

