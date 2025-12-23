import { Context, Next } from "hono";
import { auth } from "../lib/auth";

export const workerMiddleware = async (c: Context, next: Next) => {
    // 1. Check for Worker Token
    const workerToken = process.env.WORKER_TOKEN;
    const authHeader = c.req.header("Authorization");

    if (workerToken && authHeader === `Bearer ${workerToken}`) {
        return await next();
    }

    // 2. Fallback: Check for Admin Session (for browser-based workers)
    const session = await auth.api.getSession({
        headers: c.req.raw.headers
    });

    if (session) {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail && session.user.email === adminEmail) {
            return await next();
        }
    }

    // 3. Deny if neither is valid
    if (!workerToken && !session) {
        return c.json({ error: "Unauthorized: Worker token or Admin session required" }, 401);
    }

    return c.json({ error: "Unauthorized: Invalid credentials" }, 401);
};

