import type { Address } from "@happy.tech/common"

import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { AdminWalletParamSchema, GameIdParamSchema, UserWalletParamSchema } from "../../validation/games/gameSchema"
import {
    GameCreateRequestSchema,
    GameQuerySchema,
    GameScoresQuerySchema,
    GameUpdateRequestSchema,
    ScoreSubmitRequestSchema,
} from "../../validation/games/gameSchema"

export default new Hono()

    // GET /games - List games (with filtering)
    .get("/", zValidator("query", GameQuerySchema), async (c) => {
        try {
            const query = c.req.valid("query")
            const { gameRepo } = c.get("repos")

            const games = await gameRepo.find({
                name: query.name,
                admin_id: query.admin_id,
            })

            return c.json({ ok: true, data: games })
        } catch (err) {
            console.error("Error listing games:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // GET /games/:id - Get game by ID
    .get("/:id", zValidator("param", GameIdParamSchema), async (c) => {
        try {
            const { id } = c.req.valid("param")
            const { gameRepo } = c.get("repos")

            const game = await gameRepo.findById(id)
            if (!game) {
                return c.json({ ok: false, error: "Game not found" }, 404)
            }

            return c.json({ ok: true, data: game })
        } catch (err) {
            console.error(`Error fetching game ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // GET /games/admin/:admin_wallet - List games by admin_wallet
    .get("/admin/:admin_wallet", zValidator("param", AdminWalletParamSchema), async (c) => {
        try {
            const { admin_wallet } = c.req.valid("param")
            const { gameRepo, userRepo } = c.get("repos")
            // Find user by wallet
            const admin = await userRepo.findByWalletAddress(admin_wallet as Address)
            if (!admin) {
                return c.json({ ok: false, error: "Admin user not found for provided wallet address" }, 404)
            }
            const games = await gameRepo.findByAdmin(admin.id)
            return c.json({ ok: true, data: games })
        } catch (err) {
            console.error("Error listing games by admin:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // POST /games - Create new game
    .post("/", zValidator("json", GameCreateRequestSchema), async (c) => {
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

    // PATCH /games/:id - Update game details (admin only)
    .patch("/:id", zValidator("param", GameIdParamSchema), zValidator("json", GameUpdateRequestSchema), async (c) => {
        try {
            const { id } = c.req.valid("param")
            const updateData = c.req.valid("json")
            const { gameRepo } = c.get("repos")

            // Check if game exists
            const game = await gameRepo.findById(id)
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

            const updatedGame = await gameRepo.update(id, updateData)
            return c.json({ ok: true, data: updatedGame })
        } catch (err) {
            console.error(`Error updating game ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // POST /games/:id/scores - Submit new score
    .post(
        "/:id/scores",
        zValidator("param", GameIdParamSchema),
        zValidator("json", ScoreSubmitRequestSchema),
        async (c) => {
            try {
                const { id: gameId } = c.req.valid("param")
                const { user_wallet, score, metadata } = c.req.valid("json")
                const { gameRepo, userRepo } = c.get("repos")

                // Check if game exists
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
                const newScore = await gameScoreRepo.submitScore(user.id, gameId, score, metadata)
                return c.json({ ok: true, data: newScore }, 201)
            } catch (err) {
                console.error(`Error submitting score for game ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    // GET /games/:id/scores - Get scores for a game
    .get(
        "/:id/scores",
        zValidator("param", GameIdParamSchema),
        zValidator("query", GameScoresQuerySchema),
        async (c) => {
            try {
                const { id: gameId } = c.req.valid("param")
                const { top } = c.req.valid("query")
                const { gameRepo } = c.get("repos")

                // Check if game exists
                const game = await gameRepo.findById(gameId)
                if (!game) {
                    return c.json({ ok: false, error: "Game not found" }, 404)
                }

                // Get scores for the game
                const { gameScoreRepo } = c.get("repos")
                const scores = await gameScoreRepo.findGameScores(gameId, top)
                return c.json({ ok: true, data: scores })
            } catch (err) {
                console.error(`Error fetching scores for game ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    // GET /games/:id/scores/:userId - Get scores for a user in a game
    .get(
        "/:id/scores/user/:user_wallet",
        zValidator("param", GameIdParamSchema.merge(UserWalletParamSchema)),
        async (c) => {
            try {
                const { id: gameId, user_wallet } = c.req.valid("param")
                const { gameRepo, userRepo } = c.get("repos")

                // Check if game exists
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
                return c.json({ ok: true, data: scores })
            } catch (err) {
                console.error(`Error fetching user ${c.req.param("userId")} scores for game ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )
