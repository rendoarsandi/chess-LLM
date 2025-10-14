import {
  DurableObjectState,
  DurableObject,
} from "@cloudflare/workers-types";
import { Chess } from "chess.js";
import { getAiMove } from "../lib/gemini";
import { Env } from "../index";

export class GameDO implements DurableObject {
  state: DurableObjectState;
  chess: Chess;
  pgn: string;
  fen: string;
  errorCount: number;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.chess = new Chess();
    this.pgn = "";
    this.fen = this.chess.fen();
    this.errorCount = 0;
    this.env = env;

    this.state.blockConcurrencyWhile(async () => {
      const storedPgn = await this.state.storage.get<string>("pgn");
      const storedFen = await this.state.storage.get<string>("fen");
      const storedErrorCount = await this.state.storage.get<number>(
        "errorCount"
      );

      if (storedPgn) {
        this.pgn = storedPgn;
        this.chess.loadPgn(this.pgn);
      }
      if (storedFen) {
        this.fen = storedFen;
      }
      if (storedErrorCount) {
        this.errorCount = storedErrorCount;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, ""); // Remove /api prefix

    switch (request.method) {
      case "POST":
        if (path === "/move") {
          return this.handleMove(request);
        }
        if (path === "/ai-move") {
          return this.handleAiMove(request);
        }
        if (path === "/reset") {
          return this.handleReset();
        }
        break;
      case "GET":
        if (path === "/state") {
          return this.handleGetState();
        }
        if (path === "/reasoning") {
          return this.handleGetReasoning();
        }
        break;
    }

    return new Response("Not Found", { status: 404 });
  }

  private async handleMove(request: Request): Promise<Response> {
    try {
      const { move, gameMode } = (await request.json()) as { move: string, gameMode: string };

      // chess.js can throw an error on an illegal move
      const result = this.chess.move(move);

      if (result === null) {
        this.errorCount++;
        await this.state.storage.put("errorCount", this.errorCount);
        if (this.errorCount >= 5) {
          this.chess.setComment("Game over by error limit");
        }
        return new Response(
          JSON.stringify({
            error: "Illegal move",
            errorCount: this.errorCount,
            isLoss: this.errorCount >= 5,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      this.fen = this.chess.fen();
      this.pgn = this.chess.pgn();

      await this.state.storage.put("fen", this.fen);
      await this.state.storage.put("pgn", this.pgn);

      // After a successful human move, trigger the AI move
      if (!this.chess.isGameOver() && gameMode !== 'ai-vs-ai') {
        this.state.waitUntil(this.handleAiMove(request));
      }

      return new Response(JSON.stringify({ fen: this.fen, pgn: this.pgn }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      this.errorCount++;
      await this.state.storage.put("errorCount", this.errorCount);
      return new Response(
        JSON.stringify({
          error: "Invalid move format or game state error.",
          errorCount: this.errorCount,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  private async handleAiMove(request: Request): Promise<Response> {
    const { aiModel, gameMode } = (await request.json()) as { aiModel: string, gameMode: string };

    if (this.chess.isGameOver()) {
      return new Response("Game is over", { status: 400 });
    }

    const { move, reasoning } = await getAiMove(
      this.pgn,
      this.fen,
      aiModel,
      this.env.GEMINI_API_KEY
    );

    const result = this.chess.move(move);

    if (result === null) {
      this.errorCount++;
      await this.state.storage.put("errorCount", this.errorCount);
      if (this.errorCount >= 5) {
        this.chess.setComment("Game over by error limit");
      }
      // Even if the AI makes an illegal move, we should return the reasoning
      return new Response(
        JSON.stringify({
          error: "AI made an illegal move",
          errorCount: this.errorCount,
          reasoning,
          isLoss: this.errorCount >= 5,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    this.fen = this.chess.fen();
    this.pgn = this.chess.pgn();

    await this.state.storage.put("fen", this.fen);
    await this.state.storage.put("pgn", this.pgn);
    await this.state.storage.put("aiReasoning", reasoning);

    if (gameMode === 'ai-vs-ai' && !this.chess.isGameOver()) {
      this.state.waitUntil(this.handleAiMove(request));
    }

    return new Response(
      JSON.stringify({
        fen: this.fen,
        pgn: this.pgn,
        reasoning,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  private async handleGetReasoning(): Promise<Response> {
    const reasoning = await this.state.storage.get("aiReasoning");
    return new Response(JSON.stringify({ reasoning }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleReset(): Promise<Response> {
    this.chess.reset();
    this.fen = this.chess.fen();
    this.pgn = this.chess.pgn();
    this.errorCount = 0;

    await this.state.storage.put("fen", this.fen);
    await this.state.storage.put("pgn", this.pgn);
    await this.state.storage.put("errorCount", this.errorCount);

    return new Response(JSON.stringify({ message: "Game reset" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private handleGetState(): Response {
    return new Response(
      JSON.stringify({
        fen: this.fen,
        pgn: this.pgn,
        errorCount: this.errorCount,
        turn: this.chess.turn(),
        isGameOver: this.chess.isGameOver() || this.errorCount >= 5,
        isCheckmate: this.chess.isCheckmate(),
        isDraw: this.chess.isDraw(),
        isStalemate: this.chess.isStalemate(),
        isLoss: this.errorCount >= 5,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}