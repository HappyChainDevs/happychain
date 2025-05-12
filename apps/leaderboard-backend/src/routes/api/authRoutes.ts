import type { Address, Hex } from "@happy.tech/common"
import { Hono } from "hono"
import { requireAuth, verifySignature } from "../../auth"
import type { AuthSessionTableId } from "../../db/types"
import {
    AuthChallengeDescription,
    AuthChallengeValidation,
    AuthLogoutDescription,
    AuthMeDescription,
    AuthSessionsDescription,
    AuthVerifyDescription,
    AuthVerifyValidation,
    SessionIdValidation,
} from "../../validation/auth"

export default new Hono()
    /**
     * Request a challenge to sign
     * POST /auth/challenge
     */
    .post("/challenge", AuthChallengeDescription, AuthChallengeValidation, async (c) => {
        const { primary_wallet } = c.req.valid("json")
        const { authRepo } = c.get("repos")

        // Generate challenge message
        const message = authRepo.generateChallenge(primary_wallet)

        // Return the challenge message for the frontend to request signature
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

        // Find or create user
        const user = await userRepo.findByWalletAddress(primary_wallet, true)

        if (!user) {
            return c.json({ error: "User not found", ok: false }, 404)
        }

        // Create a new session
        const session = await authRepo.createSession(user.id, primary_wallet)

        if (!session) {
            return c.json({ error: "Failed to create session", ok: false }, 500)
        }

        // Return success with session ID and user info
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
     */
    .post("/logout", AuthLogoutDescription, SessionIdValidation, async (c) => {
        const { session_id } = c.req.valid("json")
        const { authRepo } = c.get("repos")

        const success = await authRepo.deleteSession(session_id as AuthSessionTableId)

        return c.json({
            ok: success,
            message: success ? "Logged out successfully" : "Session not found",
        })
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
