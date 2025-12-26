import { Context, Next } from "hono";
import { auth } from "../lib/auth";

export const workerMiddleware = async (c: Context, next: Next) => {
    // Development Bypass
    return await next();

    /*
    // 1. Check for Worker Token
    ...
    */
}

