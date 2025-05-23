import { Hono } from "hono"
import { deleteCookie, setCookie } from "hono/cookie"
import { parseSiweMessage, validateSiweMessage } from "viem/siwe"
import { requireAuth, verifySignature } from "../../auth"
import type { AuthSessionTableId } from "../../db/types"
import { sessionCookieConfig } from "../../env"
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
     *
     * Generates an EIP-4361 (Sign-In with Ethereum) compliant challenge message
     * for the user to sign with their wallet.
     */
    .post("/challenge", AuthChallengeDescription, AuthChallengeValidation, async (c) => {
        try {
            const { primary_wallet } = c.req.valid("json")
            const { authRepo } = c.get("repos")

            // Generate resources list for this authentication
            // These are URIs the user will be able to access after authentication (template)
            const resources = [
                "https://happychain.app/profile",
                "https://happychain.app/leaderboard",
                "https://happychain.app/games",
            ]

            // Create a challenge with the wallet address and resources
            const challenge = await authRepo.createChallenge(primary_wallet, resources)

            if (!challenge) {
                return c.json({ ok: false, error: "Failed to generate challenge" }, 500)
            }

            // Return just the message to the client - everything they need is contained within it
            return c.json({
                ok: true,
                data: {
                    message: challenge.message,
                },
            })
        } catch (err) {
            console.error("Error generating auth challenge:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Verify signature and create session
     * POST /auth/verify
     */
    .post("/verify", AuthVerifyDescription, AuthVerifyValidation, async (c) => {
        try {
            const { primary_wallet, message, signature } = c.req.valid("json")
            const { authRepo, userRepo } = c.get("repos")

            try {
                const parsedMessage = parseSiweMessage(message)

                const isValidFormat = validateSiweMessage({
                    message: parsedMessage,
                    address: primary_wallet,
                })

                if (!isValidFormat) {
                    return c.json({ ok: false, error: "Invalid message format" }, 400)
                }

                if (parsedMessage.address && parsedMessage.address.toLowerCase() !== primary_wallet.toLowerCase()) {
                    return c.json({ ok: false, error: "Address mismatch in message" }, 400)
                }
            } catch (error) {
                console.error("Error parsing SIWE message:", error)
                return c.json({ ok: false, error: "Invalid message format" }, 400)
            }

            // Step 1: Validate the challenge from db
            const isChallengeValid = await authRepo.validateChallenge(primary_wallet, message)
            if (!isChallengeValid) {
                return c.json({ ok: false, error: "Invalid or expired challenge" }, 401)
            }

            // Step 2: Verify the signature on-chain with the SCA
            const isSignatureValid = await verifySignature(primary_wallet, message, signature)
            if (!isSignatureValid) {
                return c.json({ ok: false, error: "Invalid signature" }, 401)
            }

            const markChallengeAsUsed = await authRepo.markChallengeAsUsed(primary_wallet, message)
            if (!markChallengeAsUsed) {
                return c.json({ ok: false, error: "Failed to mark challenge as used" }, 500)
            }

            const user = await userRepo.findByWalletAddress(primary_wallet, true)
            if (!user) {
                return c.json({ ok: false, error: "User not found" }, 404)
            }

            const session = await authRepo.createSession(user.id, primary_wallet)
            if (!session) {
                return c.json({ ok: false, error: "Error creating session" }, 500)
            }

            setCookie(c, sessionCookieConfig.name, session.id, sessionCookieConfig)

            return c.json({
                ok: true,
                data: {
                    session_id: session.id,
                    user,
                },
            })
        } catch (err) {
            console.error("Error verifying auth signature:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Get user info from session
     * GET /auth/me
     */
    .get("/me", AuthMeDescription, requireAuth, async (c) => {
        try {
            const { userRepo } = c.get("repos")
            const userId = c.get("userId")

            const user = await userRepo.findById(userId)
            if (!user) {
                return c.json({ ok: false, error: "User not found" }, 404)
            }

            return c.json({
                ok: true,
                data: {
                    session_id: c.get("sessionId") as string,
                    user: {
                        id: user.id,
                        username: user.username,
                        primary_wallet: user.primary_wallet,
                        wallets: user.wallets,
                    },
                },
            })
        } catch (err) {
            console.error("Error retrieving user session info:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Logout (delete session)
     * POST /auth/logout
     */
    .post("/logout", AuthLogoutDescription, requireAuth, async (c) => {
        try {
            const sessionId = c.get("sessionId")
            const { authRepo } = c.get("repos")

            const success = await authRepo.deleteSession(sessionId as AuthSessionTableId)

            if (!success) {
                return c.json({ ok: false, error: "Failed to delete session" }, 500)
            }

            // Delete the session cookie
            deleteCookie(c, sessionCookieConfig.name, {
                path: sessionCookieConfig.path,
                secure: sessionCookieConfig.secure,
                domain: sessionCookieConfig.domain,
                sameSite: sessionCookieConfig.sameSite,
            })

            return c.json({
                ok: true,
                data: {
                    message: "Logged out successfully",
                },
            })
        } catch (err) {
            console.error("Error logging out user:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * List all active sessions for a user
     * GET /auth/sessions
     */
    .get("/sessions", AuthSessionsDescription, requireAuth, async (c) => {
        try {
            const { authRepo } = c.get("repos")
            const userId = c.get("userId")

            const sessions = await authRepo.getUserSessions(userId)

            return c.json({
                ok: true,
                data: sessions.map((s) => ({
                    ...s,
                    is_current: s.id === c.get("sessionId"),
                })),
            })
        } catch (err) {
            console.error("Error retrieving user sessions:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })
