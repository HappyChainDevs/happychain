import { Hono } from "hono"
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

        // Verify signature
        const isValid = await authRepo.verifySignature(
            primary_wallet as `0x${string}`,
            message as `0x${string}`,
            signature as `0x${string}`,
        )

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
            session_id: session.id,
            user: {
                id: user.id,
                username: user.username,
                primary_wallet: user.primary_wallet,
            },
        })
    })

    /**
     * Get user info from session
     * GET /auth/me
     */
    .get("/me", AuthMeDescription, async (c) => {
        const authHeader = c.req.header("Authorization")

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return c.json({ error: "Authentication required", ok: false }, 401)
        }

        const sessionId = authHeader.substring(7) as AuthSessionTableId

        const { authRepo, userRepo } = c.get("repos")
        const session = await authRepo.verifySession(sessionId)

        if (!session) {
            return c.json({ error: "Invalid or expired session", ok: false }, 401)
        }

        const user = await userRepo.findById(session.user_id)

        if (!user) {
            return c.json({ error: "User not found", ok: false }, 404)
        }

        return c.json({
            ok: true,
            session_id: sessionId,
            user: {
                id: user.id,
                username: user.username,
                primary_wallet: user.primary_wallet,
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
     */
    .get("/sessions", AuthSessionsDescription, async (c) => {
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

        const sessions = await authRepo.getUserSessions(session.user_id)

        return c.json({
            ok: true,
            sessions: sessions.map((s) => ({
                id: s.id,
                primary_wallet: s.primary_wallet,
                created_at: s.created_at,
                last_used_at: s.last_used_at,
                is_current: s.id === sessionId,
            })),
        })
    })
