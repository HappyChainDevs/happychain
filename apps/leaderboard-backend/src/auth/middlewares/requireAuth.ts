import type { Address } from "@happy.tech/common"
import type { MiddlewareHandler } from "hono"
import { createMiddleware } from "hono/factory"
import type { AuthSessionTableId, UserTableId } from "../../db/types"

// Define the context variables we'll set in the middleware
declare module "hono" {
    interface ContextVariableMap {
        userId: UserTableId
        primaryWallet: Address
        sessionId: AuthSessionTableId
    }
}

/**
 * Middleware that verifies if a user is authenticated via session
 * Requires Authorization header with Bearer token containing the session ID
 */
export const requireAuth: MiddlewareHandler = createMiddleware(async (c, next) => {
    const authHeader = c.req.header("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Authentication required", ok: false }, 401)
    }

    const sessionId = authHeader.substring(7) as AuthSessionTableId

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
