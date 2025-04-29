import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import {
    UserCreateRequestSchema,
    UserIdParamSchema,
    UserQuerySchema,
    UserUpdateRequestSchema,
    UserWalletAddRequestSchema,
    UserWalletParamSchema,
} from "../../validation/schema/userSchema"

export default new Hono()

    // GET /users - List users (with filtering)
    .get("/", zValidator("query", UserQuerySchema), async (c) => {
        try {
            const query = c.req.valid("query")
            const { userRepo } = c.get("repos")

            const users = await userRepo.find({
                wallet_address: query.wallet_address,
                username: query.username,
                includeWallets: query.include_wallets,
            })

            return c.json({ ok: true, data: users })
        } catch (err) {
            console.error("Error listing users:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // GET /users/:id - Get user by ID
    .get("/:id", zValidator("param", UserIdParamSchema), async (c) => {
        try {
            const { id } = c.req.valid("param")
            const { userRepo } = c.get("repos")

            const user = await userRepo.findById(id, true) // Include wallets
            if (!user) {
                return c.json({ ok: false, error: "User not found" }, 404)
            }

            return c.json({ ok: true, data: user })
        } catch (err) {
            console.error(`Error fetching user ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // POST /users - Create new user
    .post("/", zValidator("json", UserCreateRequestSchema), async (c) => {
        try {
            const userData = c.req.valid("json")
            const { userRepo } = c.get("repos")

            // Check if user with this wallet or username already exists
            const existingByWallet = await userRepo.findByWalletAddress(userData.primary_wallet)
            if (existingByWallet) {
                return c.json({ ok: false, error: "Wallet address already registered" }, 409)
            }

            const existingByUsername = await userRepo.findByUsername(userData.username)
            if (existingByUsername) {
                return c.json({ ok: false, error: "Username already taken" }, 409)
            }

            const newUser = await userRepo.create({
                primary_wallet: userData.primary_wallet,
                username: userData.username,
            })

            return c.json({ ok: true, data: newUser }, 201)
        } catch (err) {
            console.error("Error creating user:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // PATCH /users/:id - Update user details
    .patch("/:id", zValidator("param", UserIdParamSchema), zValidator("json", UserUpdateRequestSchema), async (c) => {
        try {
            const { id } = c.req.valid("param")
            const updateData = c.req.valid("json")
            const { userRepo } = c.get("repos")

            // Check if user exists
            const user = await userRepo.findById(id)
            if (!user) {
                return c.json({ ok: false, error: "User not found" }, 404)
            }

            // Check if username is being changed and is unique
            if (updateData.username && updateData.username !== user.username) {
                const existingUser = await userRepo.findByUsername(updateData.username)
                if (existingUser) {
                    return c.json({ ok: false, error: "Username already taken" }, 409)
                }
            }

            const updatedUser = await userRepo.update(id, updateData)
            return c.json({ ok: true, data: updatedUser })
        } catch (err) {
            console.error(`Error updating user ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // GET /users/:id/wallets - Get user's wallets
    .get("/:id/wallets", zValidator("param", UserIdParamSchema), async (c) => {
        try {
            const { id } = c.req.valid("param")
            const { userRepo } = c.get("repos")

            // Check if user exists
            const user = await userRepo.findById(id)
            if (!user) {
                return c.json({ ok: false, error: "User not found" }, 404)
            }

            const wallets = await userRepo.getUserWallets(id)
            return c.json({ ok: true, data: wallets })
        } catch (err) {
            console.error(`Error fetching wallets for user ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // POST /users/:id/wallets - Add wallet to user
    .post(
        "/:id/wallets",
        zValidator("param", UserIdParamSchema),
        zValidator("json", UserWalletAddRequestSchema),
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                const { wallet_address, set_as_primary } = c.req.valid("json")
                const { userRepo } = c.get("repos")

                // Check if user exists
                const user = await userRepo.findById(id)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                // Check if wallet already belongs to another user
                const existingUser = await userRepo.findByWalletAddress(wallet_address)
                if (existingUser && existingUser.id !== id) {
                    return c.json({ ok: false, error: "Wallet already registered to another user" }, 409)
                }

                const success = await userRepo.addWallet(id, wallet_address, set_as_primary || false)
                if (!success) {
                    return c.json({ ok: false, error: "Wallet already exists for this user" }, 409)
                }

                // Get updated user with wallets
                const updatedUser = await userRepo.findById(id, true)
                return c.json({ ok: true, data: updatedUser })
            } catch (err) {
                console.error(`Error adding wallet for user ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    // PATCH /users/:id/wallets/:addr - Set wallet as primary
    .patch("/:id/wallets/:addr", zValidator("param", UserWalletParamSchema), async (c) => {
        try {
            const { id, addr } = c.req.valid("param")
            const { userRepo } = c.get("repos")

            // Check if user exists
            const user = await userRepo.findById(id)
            if (!user) {
                return c.json({ ok: false, error: "User not found" }, 404)
            }

            const success = await userRepo.setWalletAsPrimary(id, addr)
            if (!success) {
                return c.json({ ok: false, error: "Wallet not found for this user" }, 404)
            }

            // Get updated user with wallets
            const updatedUser = await userRepo.findById(id, true)
            return c.json({ ok: true, data: updatedUser })
        } catch (err) {
            console.error(`Error setting primary wallet for user ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    // DELETE /users/:id/wallets/:addr - Remove wallet from user
    .delete("/:id/wallets/:addr", zValidator("param", UserWalletParamSchema), async (c) => {
        try {
            const { id, addr } = c.req.valid("param")
            const { userRepo } = c.get("repos")

            // Check if user exists
            const user = await userRepo.findById(id)
            if (!user) {
                return c.json({ ok: false, error: "User not found" }, 404)
            }

            const success = await userRepo.removeWallet(id, addr)
            if (!success) {
                return c.json(
                    {
                        ok: false,
                        error: "Cannot remove wallet: it may be the primary wallet or not found",
                    },
                    400,
                )
            }

            // Get updated user with wallets
            const updatedUser = await userRepo.findById(id, true)
            return c.json({ ok: true, data: updatedUser })
        } catch (err) {
            console.error(`Error removing wallet for user ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })
