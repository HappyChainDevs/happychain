import type { MiddlewareHandler } from "hono"
import { getCookie } from "hono/cookie"
import { createMiddleware } from "hono/factory"
import type { AuthSessionTableId } from "../../db/types"

/**
 * Middleware that verifies if a user is authenticated via session
 * Checks for session ID in cookie
 */
export const requireAuth: MiddlewareHandler = createMiddleware(async (c, next) => {
    const sessionId = getCookie(c, "session_id") as AuthSessionTableId | undefined
    if (!sessionId) {
        return c.json({ error: "Authentication required", ok: false }, 401)
    }

    const { authRepo } = c.get("repos")
    const session = await authRepo.verifySession(sessionId)

    if (!session) {
        return c.json({ error: "Invalid or expired session", ok: false }, 401)
    }

    // Set user context for downstream middleware and handlers
    c.set("userId", session.user_id)
    c.set("primaryWallet", session.primary_wallet)
    c.set("sessionId", session.id)

    await next()
})
