import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Chess } from "chess.js";
import { callGemini } from "./gemini";

export const generateAiMove = action({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.runQuery(api.games.get, { id: gameId });

    if (!game || game.status !== "in_progress") {
      return;
    }

    const chess = new Chess(game.fen);
    const legalMoves = chess.moves({ verbose: true });

    const player = game.turn === "w" ? game.player1 : game.player2;
    const model = player.model || "2.5-flash"; // Default to flash

    try {
      const { move, reasoning, opening } = await callGemini(
        model,
        game.fen,
        game.pgn,
        legalMoves.map((m) => m.san)
      );

      // Final validation that the move from AI is legal
      const moveObject = chess.move(move, { sloppy: true });
      if (moveObject === null) {
        throw new Error("AI returned an illegal move.");
      }

      // Update game state with AI's move and thoughts
      await ctx.runMutation(api.games.makeMove, {
        gameId,
        move: moveObject.san,
        player: game.turn,
      });

      // Patch in the AI reasoning and opening name after the move is made
      await ctx.runMutation(api.ai.storeAiResponse, {
        gameId,
        reasoning,
        opening,
      });

    } catch (error) {
      console.error("Error during AI move generation:", error);
      // Fallback strategy: pick a random legal move
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      await ctx.runMutation(api.games.makeMove, {
        gameId,
        move: randomMove.san,
        player: game.turn,
      });
       await ctx.runMutation(api.ai.storeAiResponse, {
        gameId,
        reasoning: "Error in generation, used fallback: random move.",
        opening: "Unknown",
      });
    }
  },
});

export const storeAiResponse = mutation({
    args: {
        gameId: v.id("games"),
        reasoning: v.string(),
        opening: v.string(),
    },
    handler: async (ctx, { gameId, reasoning, opening }) => {
        await ctx.db.patch(gameId, {
            aiReasoning: reasoning,
            openingName: opening,
        });
    }
});
