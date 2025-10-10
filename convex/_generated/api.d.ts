import type {
  ApiFromModules,
  FilterApi,
} from "convex/server";
import type * as crons from "../crons";
import type * as games from "../games";

export const internal: FilterApi<
  ApiFromModules<{
    crons: typeof crons;
    games: typeof games;
  }>,
  "internal"
>;

export const api: FilterApi<
  ApiFromModules<{
    crons: typeof crons;
    games: typeof games;
  }>,
  "public"
>;