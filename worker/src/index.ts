import {
  DurableObjectNamespace,
  D1Database,
  KVNamespace,
  ExecutionContext,
} from "@cloudflare/workers-types";
import { GameDO } from "./durable-objects/GameDO";
import { getAssetFromKV } from "@cloudflare/kv-asset-handler";

export interface Env {
  GAME_DO: DurableObjectNamespace;
  DB: D1Database;
  OPENINGS_KV: KVNamespace;
  GEMINI_API_KEY: string;
  __STATIC_CONTENT: KVNamespace;
  __STATIC_CONTENT_MANIFEST: string;
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

      // Handle API routes
      if (path.startsWith("/api/")) {
        // Player stats and leaderboard endpoints
        if (path === "/api/leaderboard") {
          const players = await env.DB.prepare(
            `SELECT id, name, display_name, elo_rating, peak_elo, games_played, wins, losses, draws
             FROM ai_players
             ORDER BY elo_rating DESC`
          ).all();

          return new Response(JSON.stringify(players.results), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }

        if (path.startsWith("/api/player/")) {
          const playerId = path.split("/api/player/")[1];
          const player = await env.DB.prepare(
            `SELECT * FROM ai_players WHERE id = ?`
          ).bind(playerId).first();

          if (!player) {
            return new Response(JSON.stringify({ error: "Player not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" }
            });
          }

          // Get recent ELO history
          const history = await env.DB.prepare(
            `SELECT * FROM elo_history
             WHERE ai_player_id = ?
             ORDER BY created_at DESC
             LIMIT 20`
          ).bind(playerId).all();

          return new Response(JSON.stringify({
            player,
            history: history.results
          }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }

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
          return await stub.fetch(newRequest as any) as unknown as Response;
        }
      }

      // Serve Next.js static assets
      try {
        return await getAssetFromKV(
          {
            request,
            waitUntil: ctx.waitUntil.bind(ctx),
          },
          {
            ASSET_NAMESPACE: env.__STATIC_CONTENT,
            ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST,
            cacheControl: {
              bypassCache: false,
            },
          }
        );
      } catch (e) {
        // If asset not found, serve index.html for client-side routing
        try {
          const notFoundResponse = await getAssetFromKV(
            {
              request: new Request(`${url.origin}/index.html`, request),
              waitUntil: ctx.waitUntil.bind(ctx),
            },
            {
              ASSET_NAMESPACE: env.__STATIC_CONTENT,
              ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST,
            }
          );
          return new Response(notFoundResponse.body, {
            ...notFoundResponse,
            status: 200,
          });
        } catch (error) {
          return new Response("Not Found", { status: 404 });
        }
      }
    } catch (error) {
      console.error("Error in worker fetch handler:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};