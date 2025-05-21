import type { Address } from "@happy.tech/common"
import { Hono } from "hono"
import { requireAuth, requireGameOwnership } from "../../auth"
import type { GameTableId, UserTableId } from "../../db/types"
import {
    AdminWalletParamValidation,
    GameCreateDescription,
    GameCreateValidation,
    GameGetByIdDescription,
    GameIdParamValidation,
    GameListByAdminDescription,
    GameQueryDescription,
    GameQueryValidation,
    GameScoresListDescription,
    GameScoresQueryValidation,
    GameUpdateDescription,
    GameUpdateValidation,
    ScoreSubmitDescription,
    ScoreSubmitValidation,
    UserGameScoresListDescription,
    UserWalletParamValidation,
} from "../../validation/games"

export default new Hono()

    // ====================================================================================================
    // Game Collection Routes

    /**
     * List all games (optionally filter by name, admin, etc)
     * GET /games
     */
    .get("/", GameQueryDescription, GameQueryValidation, async (c) => {
        try {
            const { name, admin_id } = c.req.valid("query")
            const { gameRepo } = c.get("repos")

            const games = await gameRepo.find({
                name: name ? name : undefined,
                admin_id: admin_id ? (admin_id as UserTableId) : undefined,
            })

            return c.json({ ok: true, data: games }, 200)
        } catch (err) {
            console.error("Error listing games:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Get a game by ID
     * GET /games/:id
     */
    .get("/:id", GameGetByIdDescription, GameIdParamValidation, async (c) => {
        try {
            const { id } = c.req.valid("param")
            const { gameRepo } = c.get("repos")

            const gameId = id as GameTableId
            const game = await gameRepo.findById(gameId)
            if (!game) {
                return c.json({ ok: false, error: "Game not found" }, 404)
            }

            return c.json({ ok: true, data: game }, 200)
        } catch (err) {
            console.error(`Error fetching game ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // ====================================================================================================
    // Game Listing by Admin

    /**
     * List all games for a given admin wallet
     * GET /games/admin/:admin_wallet
     */
    .get("/admin/:admin_wallet", GameListByAdminDescription, AdminWalletParamValidation, async (c) => {
        try {
            const { admin_wallet } = c.req.valid("param")
            const { gameRepo, userRepo } = c.get("repos")

            // Find user by wallet
            const admin = await userRepo.findByWalletAddress(admin_wallet as Address)
            if (!admin) {
                return c.json({ ok: false, error: "Admin user not found for provided wallet address" }, 404)
            }
            const games = await gameRepo.findByAdmin(admin.id)
            return c.json({ ok: true, data: games }, 200)
        } catch (err) {
            console.error("Error listing games by admin:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Create a new game (admin required)
     * POST /games
     */
    .post("/", requireAuth, GameCreateDescription, GameCreateValidation, async (c) => {
        try {
            const gameData = c.req.valid("json")
            const { gameRepo, userRepo } = c.get("repos")

            // Check if game name already exists
            const existingGame = await gameRepo.findByExactName(gameData.name)
            if (existingGame) {
                return c.json({ ok: false, error: "Game name already exists" }, 409)
            }

            // Check if admin user exists by wallet address
            const admin = await userRepo.findByWalletAddress(gameData.admin_wallet as Address)
            if (!admin) {
                return c.json({ ok: false, error: "Admin user not found for provided wallet address" }, 404)
            }

            const newGame = await gameRepo.create({
                name: gameData.name,
                icon_url: gameData.icon_url || null,
                description: gameData.description || null,
                admin_id: admin.id,
            })

            return c.json({ ok: true, data: newGame }, 201)
        } catch (err) {
            console.error("Error creating game:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // ====================================================================================================
    // Individual Game Routes

    /**
     * Update game details (admin only)
     * PATCH /games/:id
     * Requires game ownership - only the game creator can update it
     */
    .patch(
        "/:id",
        requireAuth,
        requireGameOwnership,
        GameUpdateDescription,
        GameIdParamValidation,
        GameUpdateValidation,
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                const updateData = c.req.valid("json")
                const { gameRepo } = c.get("repos")

                // Check if game exists
                const gameId = id as GameTableId
                const game = await gameRepo.findById(gameId)
                if (!game) {
                    return c.json({ ok: false, error: "Game not found" }, 404)
                }

                // Check if name is being changed and is unique
                if (updateData.name && updateData.name !== game.name) {
                    const existingGame = await gameRepo.findByExactName(updateData.name)
                    if (existingGame) {
                        return c.json({ ok: false, error: "Game name already exists" }, 409)
                    }
                }

                const updatedGame = await gameRepo.update(gameId, updateData)
                return c.json({ ok: true, data: updatedGame }, 200)
            } catch (err) {
                console.error(`Error updating game ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    // ====================================================================================================
    // Game Scores Routes

    /**
     * Submit a new score for a game
     * POST /games/:id/scores
     */
    .post(
        "/:id/scores",
        requireAuth,
        ScoreSubmitDescription,
        GameIdParamValidation,
        ScoreSubmitValidation,
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                const { user_wallet, score, metadata } = c.req.valid("json")
                const { gameRepo, userRepo } = c.get("repos")

                // Check if game exists
                const gameId = id as GameTableId
                const game = await gameRepo.findById(gameId)
                if (!game) {
                    return c.json({ ok: false, error: "Game not found" }, 404)
                }

                // Check if user exists
                const user = await userRepo.findByWalletAddress(user_wallet)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                // Submit score
                const { gameScoreRepo } = c.get("repos")
                const userId = user.id as UserTableId
                const newScore = await gameScoreRepo.submitScore(userId, gameId, score, metadata)

                return c.json({ ok: true, data: newScore }, 201)
            } catch (err) {
                console.error(`Error submitting score for game ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Get all scores for a game
     * GET /games/:id/scores
     */
    .get("/:id/scores", GameScoresListDescription, GameIdParamValidation, GameScoresQueryValidation, async (c) => {
        try {
            const { id } = c.req.valid("param")
            const { top } = c.req.valid("query")
            const { gameRepo } = c.get("repos")

            // Check if game exists
            const gameId = id as GameTableId
            const game = await gameRepo.findById(gameId)
            if (!game) {
                return c.json({ ok: false, error: "Game not found" }, 404)
            }

            // Get scores for the game
            const { gameScoreRepo } = c.get("repos")
            const scores = await gameScoreRepo.findGameScores(gameId, top)
            return c.json({ ok: true, data: scores }, 200)
        } catch (err) {
            console.error(`Error fetching scores for game ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Get all scores for a user in a game
     * GET /games/:id/scores/user/:user_wallet
     */
    .get(
        "/:id/scores/user/:user_wallet",
        UserGameScoresListDescription,
        GameIdParamValidation,
        UserWalletParamValidation,
        async (c) => {
            try {
                const { id, user_wallet } = c.req.valid("param")
                const { gameRepo, userRepo } = c.get("repos")

                // Check if game exists
                const gameId = id as GameTableId
                const game = await gameRepo.findById(gameId)
                if (!game) {
                    return c.json({ ok: false, error: "Game not found" }, 404)
                }

                // Find user by wallet address
                const user = await userRepo.findByWalletAddress(user_wallet as Address)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                // Get user's scores for the game
                const { gameScoreRepo } = c.get("repos")
                const scores = await gameScoreRepo.findUserScores(user.id, gameId)
                return c.json({ ok: true, data: scores }, 200)
            } catch (err) {
                console.error(`Error fetching user ${c.req.param("userId")} scores for game ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )
