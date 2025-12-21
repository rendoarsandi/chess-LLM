import { Context, Next } from "hono";
import { auth } from "../lib/auth";

export const adminMiddleware = async (c: Context, next: Next) => {
    const session = await auth.api.getSession({
        headers: c.req.raw.headers
    });

    if (!session) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || session.user.email !== adminEmail) {
        return c.json({ error: "Forbidden: Admin access only" }, 403);
    }

    c.set("user", session.user);
    c.set("session", session.session);
    await next();
};
