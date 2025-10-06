import { zid } from "convex-helpers/server/zod";
import { z } from "zod";

export const Id = z.custom<`${string}-${string}-${string}-${string}-${string}`>(
  (val) => /^[a-z0-9_-]{22}$/.test(val as string)
);

export type Id<TableName extends string> = string & {
  __tableName: TableName;
};