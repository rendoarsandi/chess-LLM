import {
  DurableObjectState,
} from "@cloudflare/workers-types";
import { Chess } from "chess.js";
import { getAiMove } from "../lib/gemini";
import { Env } from "../index";

export class GameDO {
  state: DurableObjectState;
  chess: Chess;
  pgn: string;
  fen: string;
  errorCount: number;
  env: Env;
  gameId: string;
  gameMode: string;
  aiModel: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.chess = new Chess();
    this.pgn = "";
    this.fen = this.chess.fen();
    this.errorCount = 0;
    this.env = env;
    this.gameId = "";
    this.gameMode = "human-vs-ai";
    this.aiModel = "gemini-1.5-flash-latest";

    this.state.blockConcurrencyWhile(async () => {
      const storedPgn = await this.state.storage.get<string>("pgn");
      const storedFen = await this.state.storage.get<string>("fen");
      const storedErrorCount = await this.state.storage.get<number>(
        "errorCount"
      );
      const storedGameId = await this.state.storage.get<string>("gameId");
      const storedGameMode = await this.state.storage.get<string>("gameMode");
      const storedAiModel = await this.state.storage.get<string>("aiModel");

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
      if (storedGameId) {
        this.gameId = storedGameId;
      }
      if (storedGameMode) {
        this.gameMode = storedGameMode;
      }
      if (storedAiModel) {
        this.aiModel = storedAiModel;
      }
    });
  }

  private async saveGameToD1(result: string = "ongoing") {
    try {
      const now = Date.now();
      await this.env.DB.prepare(
        `INSERT OR REPLACE INTO games (id, pgn, fen, result, game_mode, ai_model, error_count, total_moves, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          this.gameId,
          this.pgn,
          this.fen,
          result,
          this.gameMode,
          this.aiModel,
          this.errorCount,
          this.chess.history().length,
          now,
          now
        )
        .run();
    } catch (error) {
      console.error("Error saving game to D1:", error);
    }
  }

  private async saveMoveToD1(
    moveSan: string,
    isAiMove: boolean,
    reasoning: string = ""
  ) {
    try {
      const history = this.chess.history({ verbose: true });
      const lastMove = history[history.length - 1];
      const now = Date.now();

      await this.env.DB.prepare(
        `INSERT INTO moves (game_id, move_number, move_san, move_from, move_to, player, is_ai_move, ai_reasoning, fen_after_move, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          this.gameId,
          history.length,
          moveSan,
          lastMove.from,
          lastMove.to,
          lastMove.color === "w" ? "white" : "black",
          isAiMove ? 1 : 0,
          reasoning,
          this.fen,
          now
        )
        .run();
    } catch (error) {
      console.error("Error saving move to D1:", error);
    }
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
      const { move, gameMode, aiModel } = (await request.json()) as {
        move: string;
        gameMode: string;
        aiModel?: string;
      };

      // Update game settings
      if (gameMode) this.gameMode = gameMode;
      if (aiModel) this.aiModel = aiModel;

      // chess.js can throw an error on an illegal move
      const result = this.chess.move(move);

      if (result === null) {
        this.errorCount++;
        await this.state.storage.put("errorCount", this.errorCount);
        if (this.errorCount >= 5) {
          this.chess.setComment("Game over by error limit");
          await this.saveGameToD1("loss_by_errors");
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
      await this.state.storage.put("gameMode", this.gameMode);
      await this.state.storage.put("aiModel", this.aiModel);

      // Save move to D1
      await this.saveMoveToD1(result.san, false);

      // Update game status in D1
      let gameResult = "ongoing";
      if (this.chess.isCheckmate()) {
        gameResult = this.chess.turn() === "w" ? "black_win" : "white_win";
      } else if (this.chess.isDraw() || this.chess.isStalemate()) {
        gameResult = "draw";
      }
      await this.saveGameToD1(gameResult);

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
    const { aiModel, gameMode } = (await request.json()) as {
      aiModel?: string;
      gameMode?: string;
    };

    // Update game settings if provided
    if (aiModel) this.aiModel = aiModel;
    if (gameMode) this.gameMode = gameMode;

    if (this.chess.isGameOver()) {
      return new Response("Game is over", { status: 400 });
    }

    const { move, reasoning } = await getAiMove(
      this.pgn,
      this.fen,
      this.aiModel,
      this.env.GEMINI_API_KEY
    );

    const result = this.chess.move(move);

    if (result === null) {
      this.errorCount++;
      await this.state.storage.put("errorCount", this.errorCount);
      if (this.errorCount >= 5) {
        this.chess.setComment("Game over by error limit");
        await this.saveGameToD1("loss_by_errors");
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

    // Save AI move to D1
    await this.saveMoveToD1(result.san, true, reasoning);

    // Update game status in D1
    let gameResult = "ongoing";
    if (this.chess.isCheckmate()) {
      gameResult = this.chess.turn() === "w" ? "black_win" : "white_win";
    } else if (this.chess.isDraw() || this.chess.isStalemate()) {
      gameResult = "draw";
    }
    await this.saveGameToD1(gameResult);

    if (this.gameMode === 'ai-vs-ai' && !this.chess.isGameOver()) {
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

    // Generate a unique game ID
    this.gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.state.storage.put("fen", this.fen);
    await this.state.storage.put("pgn", this.pgn);
    await this.state.storage.put("errorCount", this.errorCount);
    await this.state.storage.put("gameId", this.gameId);

    // Initialize game in D1
    await this.saveGameToD1("ongoing");

    return new Response(JSON.stringify({ message: "Game reset", gameId: this.gameId }), {
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