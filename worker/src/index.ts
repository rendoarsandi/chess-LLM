import {
  DurableObjectNamespace,
  D1Database,
  KVNamespace,
  ExecutionContext,
} from "@cloudflare/workers-types";
import { GameDO } from "./durable-objects/GameDO";

export interface Env {
  GAME_DO: DurableObjectNamespace;
  DB: D1Database;
  OPENINGS_KV: KVNamespace;
  GEMINI_API_KEY: string;
}

export { GameDO } from "./durable-objects/GameDO";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path.startsWith("/api/")) {
        // Extract the game ID from the path, e.g., /api/game/{gameId}/move
        const pathSegments = path.split("/");
        const gameIdIndex = pathSegments.indexOf("game") + 1;

        if (gameIdIndex > 0 && gameIdIndex < pathSegments.length) {
          const gameId = pathSegments[gameIdIndex];
          const doId = env.GAME_DO.idFromName(gameId);
          const stub = env.GAME_DO.get(doId);

          // Reconstruct the request URL to be relative for the DO
          const newPath = "/" + pathSegments.slice(gameIdIndex + 1).join("/");
          const newUrl = new URL(request.url);
          newUrl.pathname = newPath;

          const newRequest = new Request(newUrl.toString(), request);
          return await stub.fetch(newRequest);
        }
      }

      // In a real application, you'd serve your frontend here.
      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("Error in worker fetch handler:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};