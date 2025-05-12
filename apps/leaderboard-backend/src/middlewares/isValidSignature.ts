import { createMiddleware } from "hono/factory"
import type { AuthSessionTableId } from "../db/types"

const isValidSignature = createMiddleware(async (c, next) => {
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

    c.set("userId", session.user_id)
    c.set("primaryWallet", session.primary_wallet)
    c.set("sessionId", session.id)

    await next()
})

export { isValidSignature }
