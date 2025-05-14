import type { Address, Hex } from "@happy.tech/common"
import { Hono } from "hono"
import { deleteCookie, setCookie } from "hono/cookie"
import { requireAuth, verifySignature } from "../../auth"
import type { AuthSessionTableId } from "../../db/types"
import { env } from "../../env"
import {
    AuthChallengeDescription,
    AuthChallengeValidation,
    AuthLogoutDescription,
    AuthMeDescription,
    AuthSessionsDescription,
    AuthVerifyDescription,
    AuthVerifyValidation,
} from "../../validation/auth"

export default new Hono()
    /**
     * Request a challenge to sign
     * POST /auth/challenge
     */
    .post("/challenge", AuthChallengeDescription, AuthChallengeValidation, async (c) => {
        const { primary_wallet } = c.req.valid("json")
        // Use a hardcoded, Ethereum-style message for leaderboard authentication
        const message = `\x19Leaderboard Signed Message:\nHappyChain Leaderboard Authentication Request for ${primary_wallet}`
        return c.json({
            message,
            primary_wallet,
        })
    })

    /**
     * Verify signature and create session
     * POST /auth/verify
     */
    .post("/verify", AuthVerifyDescription, AuthVerifyValidation, async (c) => {
        const { primary_wallet, message, signature } = c.req.valid("json")
        const { authRepo, userRepo } = c.get("repos")

        // Verify signature directly using the utility function
        const isValid = await verifySignature(primary_wallet as Address, message as Hex, signature as Hex)

        if (!isValid) {
            return c.json({ error: "Invalid signature", ok: false }, 401)
        }

        const user = await userRepo.findByWalletAddress(primary_wallet, true)
        if (!user) {
            return c.json({ error: "User not found", ok: false }, 404)
        }

        const session = await authRepo.createSession(user.id, primary_wallet)
        if (!session) {
            return c.json({ error: "Failed to create session", ok: false }, 500)
        }

        setCookie(c, "session_id", session.id, {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            path: "/",
            maxAge: env.SESSION_EXPIRY,
        })

        // Return success with session ID and user info
        return c.json({
            ok: true,
            user: {
                id: user.id,
                username: user.username,
                primary_wallet: user.primary_wallet,
                wallets: user.wallets,
                sessionId: session.id,
            },
        })
    })

    /**
     * Get user info from session
     * GET /auth/me
     * @security BearerAuth
     */
    .get("/me", AuthMeDescription, requireAuth, async (c) => {
        const { userRepo } = c.get("repos")
        const userId = c.get("userId")

        const user = await userRepo.findById(userId)

        if (!user) {
            return c.json({ error: "User not found", ok: false }, 404)
        }

        return c.json({
            ok: true,
            user: {
                id: user.id,
                username: user.username,
                primary_wallet: user.primary_wallet,
                wallets: user.wallets,
                sessionId: c.get("sessionId"),
            },
        })
    })

    /**
     * Logout (delete session)
     * POST /auth/logout
     * @security BearerAuth
     */
    .post("/logout", AuthLogoutDescription, requireAuth, async (c) => {
        const sessionId = c.get("sessionId")
        const { authRepo } = c.get("repos")

        const success = await authRepo.deleteSession(sessionId as AuthSessionTableId)

        if (!success) {
            return c.json({ error: "Failed to delete session", ok: false }, 500)
        }

        // Delete the session cookie
        deleteCookie(c, "session_id", {
            path: "/",
            secure: false,
        })

        return c.json({ ok: true, message: "Logged out successfully" })
    })

    /**
     * List all active sessions for a user
     * GET /auth/sessions
     * @security BearerAuth
     */
    .get("/sessions", AuthSessionsDescription, requireAuth, async (c) => {
        const { authRepo } = c.get("repos")
        const userId = c.get("userId")

        const sessions = await authRepo.getUserSessions(userId)

        return c.json({
            ok: true,
            sessions: sessions.map((s) => ({
                ...s,
                current: s.id === c.get("sessionId"),
            })),
        })
    })
