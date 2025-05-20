import { Hono } from "hono"
import { requireAuth, requireOwnership } from "../../auth"
import type { UserTableId } from "../../db/types"
import {
    PrimaryWalletParamValidation,
    UserCreateDescription,
    UserCreateValidation,
    UserDeleteByIdDescription,
    UserDeleteByPrimaryWalletDescription,
    UserGetByIdDescription,
    UserGetByPrimaryWalletDescription,
    UserGuildsListDescription,
    UserIdParamValidation,
    UserQueryDescription,
    UserQueryValidation,
    UserUpdateByIdDescription,
    UserUpdateByPrimaryWalletDescription,
    UserUpdateValidation,
    UserWalletAddByIdDescription,
    UserWalletAddByPrimaryWalletDescription,
    UserWalletRemoveByIdDescription,
    UserWalletRemoveByPrimaryWalletDescription,
    UserWalletSetPrimaryByIdDescription,
    UserWalletSetPrimaryByPrimaryWalletDescription,
    UserWalletValidation,
    UserWalletsGetByIdDescription,
    UserWalletsGetByPrimaryWalletDescription,
} from "../../validation/users"

export default new Hono()

    // ====================================================================================================
    // User Collection Routes

    /**
     * List users with optional filters (by primary_wallet or username).
     * GET /users
     */
    .get("/", UserQueryDescription, UserQueryValidation, async (c) => {
        try {
            const query = c.req.valid("query")
            const { userRepo } = c.get("repos")

            const users = await userRepo.find({
                primary_wallet: query.primary_wallet,
                username: query.username,
                includeWallets: query.include_wallets,
            })

            return c.json({ ok: true, data: users }, 200)
        } catch (err) {
            console.error("Error listing users:", err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Create a new user.
     * POST /users
     */
    .post("/", UserCreateDescription, UserCreateValidation, async (c) => {
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

    // ====================================================================================================
    // User Resource Routes (by ID)

    /**
     * Get user details by user ID.
     * GET /users/:id
     */
    .get("/:id", UserGetByIdDescription, UserIdParamValidation, async (c) => {
        try {
            const { id } = c.req.valid("param")
            const { userRepo } = c.get("repos")

            const userTableId = id as UserTableId
            const user = await userRepo.findById(userTableId, true) // Include wallets
            if (!user) {
                return c.json({ ok: false, error: "User not found" }, 404)
            }

            return c.json({ ok: true, data: user }, 200)
        } catch (err) {
            console.error(`Error fetching user ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Update user details by user ID.
     * PATCH /users/:id
     * Requires ownership - only the user can update their own profile
     * @security BearerAuth
     */
    .patch(
        "/:id",
        requireAuth,
        requireOwnership("id", "id"),
        UserUpdateByIdDescription,
        UserIdParamValidation,
        UserUpdateValidation,
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                const updateData = c.req.valid("json")
                const { userRepo } = c.get("repos")

                // Check if user exists
                const userId = id as UserTableId
                const user = await userRepo.findById(userId)
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

                const updatedUser = await userRepo.update(userId, updateData)
                return c.json({ ok: true, data: updatedUser }, 200)
            } catch (err) {
                console.error(`Error updating user ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Delete a user by user ID and all associated data.
     * DELETE /users/:id
     * Requires ownership - only the user can delete their own profile
     * @security BearerAuth
     */
    .delete(
        "/:id",
        requireAuth,
        requireOwnership("id", "id"),
        UserDeleteByIdDescription,
        UserIdParamValidation,
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                const { userRepo } = c.get("repos")

                // Check if user exists
                const userId = id as UserTableId
                const user = await userRepo.findById(userId)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                const success = await userRepo.delete(userId)
                if (!success) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                return c.json({ ok: true, data: user }, 200)
            } catch (err) {
                console.error(`Error deleting user ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    // ====================================================================================================
    // User Resource Routes (by Primary Wallet Address)

    /**
     * Get user details by primary wallet address.
     * GET /users/pw/:primary_wallet
     */
    .get("/pw/:primary_wallet", UserGetByPrimaryWalletDescription, PrimaryWalletParamValidation, async (c) => {
        try {
            const { primary_wallet } = c.req.valid("param")
            const { userRepo } = c.get("repos")

            const user = await userRepo.findByWalletAddress(primary_wallet, true) // Include wallets
            if (!user) {
                return c.json({ ok: false, error: "User not found" }, 404)
            }

            return c.json({ ok: true, data: user }, 200)
        } catch (err) {
            console.error(`Error fetching user by wallet ${c.req.param("primary_wallet")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Update user details by primary wallet address.
     * PATCH /users/pw/:primary_wallet
     * Requires ownership - only the user can update their own profile
     * @security BearerAuth
     */
    .patch(
        "/pw/:primary_wallet",
        requireAuth,
        requireOwnership("primary_wallet", "primary_wallet"),
        UserUpdateByPrimaryWalletDescription,
        PrimaryWalletParamValidation,
        UserUpdateValidation,
        async (c) => {
            try {
                const { primary_wallet } = c.req.valid("param")
                const updateData = c.req.valid("json")
                const { userRepo } = c.get("repos")

                // Check if user exists
                const user = await userRepo.findByWalletAddress(primary_wallet)
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

                const updatedUser = await userRepo.update(user.id, updateData)
                return c.json({ ok: true, data: updatedUser }, 200)
            } catch (err) {
                console.error(`Error updating user with wallet ${c.req.param("primary_wallet")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Delete a user by primary wallet address and all associated wallets, guild memberships, and scores.
     * DELETE /users/pw/:primary_wallet
     * Requires ownership - only the user can delete their own profile
     * @security BearerAuth
     */
    .delete(
        "/pw/:primary_wallet",
        requireAuth,
        requireOwnership("primary_wallet", "primary_wallet"),
        UserDeleteByPrimaryWalletDescription,
        PrimaryWalletParamValidation,
        async (c) => {
            try {
                const { primary_wallet } = c.req.valid("param")
                const { userRepo } = c.get("repos")

                // Check if user exists
                const user = await userRepo.findByWalletAddress(primary_wallet)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                const success = await userRepo.delete(user.id)
                if (!success) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                return c.json({ ok: true, data: user }, 200)
            } catch (err) {
                console.error(`Error deleting user with wallet ${c.req.param("primary_wallet")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    // ====================================================================================================
    // User Wallets Collection Routes

    /**
     * Get all wallets for a user by user ID.
     * GET /users/:id/wallets
     */
    .get("/:id/wallets", UserWalletsGetByIdDescription, UserIdParamValidation, async (c) => {
        try {
            const { id } = c.req.valid("param")
            const { userRepo } = c.get("repos")

            // Check if user exists
            const userId = id as UserTableId
            const user = await userRepo.findById(userId)
            if (!user) {
                return c.json({ ok: false, error: "User not found" }, 404)
            }

            const wallets = await userRepo.getUserWallets(userId)
            return c.json({ ok: true, data: wallets }, 200)
        } catch (err) {
            console.error(`Error fetching wallets for user ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Get all wallets for a user by primary wallet address.
     * GET /users/pw/:primary_wallet/wallets
     */
    .get(
        "/pw/:primary_wallet/wallets",
        UserWalletsGetByPrimaryWalletDescription,
        PrimaryWalletParamValidation,
        async (c) => {
            try {
                const { primary_wallet } = c.req.valid("param")
                const { userRepo } = c.get("repos")

                // Check if user exists
                const user = await userRepo.findByWalletAddress(primary_wallet)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                const wallets = await userRepo.getUserWallets(user.id)
                return c.json({ ok: true, data: wallets }, 200)
            } catch (err) {
                console.error(`Error fetching wallets for user with wallet ${c.req.param("primary_wallet")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Add a wallet to a user by user ID.
     * POST /users/:id/wallets
     * Requires ownership - only the user can manage their own wallets
     * @security BearerAuth
     */
    .post(
        "/:id/wallets",
        requireAuth,
        requireOwnership("id", "id"),
        UserWalletAddByIdDescription,
        UserIdParamValidation,
        UserWalletValidation,
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                const { wallet_address } = c.req.valid("json")
                const { userRepo } = c.get("repos")

                // Check if user exists
                const userId = id as UserTableId
                const user = await userRepo.findById(userId)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                // Check if wallet already belongs to another user
                const existingUser = await userRepo.findByWalletAddress(wallet_address)
                if (existingUser && existingUser.id !== userId) {
                    return c.json({ ok: false, error: "Wallet already registered to another user" }, 409)
                }

                const success = await userRepo.addWallet(userId, wallet_address)
                if (!success) {
                    return c.json({ ok: false, error: "Wallet already exists for this user" }, 409)
                }

                // Get updated user with wallets
                const updatedUser = await userRepo.findById(userId, true)
                return c.json({ ok: true, data: updatedUser }, 200)
            } catch (err) {
                console.error(`Error adding wallet to user ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Add a wallet to a user by primary wallet address.
     * POST /users/pw/:primary_wallet/wallets
     * Requires ownership - only the user can manage their own wallets
     * @security BearerAuth
     */
    .post(
        "/pw/:primary_wallet/wallets",
        requireAuth,
        requireOwnership("primary_wallet", "primary_wallet"),
        UserWalletAddByPrimaryWalletDescription,
        PrimaryWalletParamValidation,
        UserWalletValidation,
        async (c) => {
            try {
                const { primary_wallet } = c.req.valid("param")
                const { wallet_address } = c.req.valid("json")
                const { userRepo } = c.get("repos")

                if (primary_wallet === wallet_address) {
                    return c.json({ ok: false, error: "Primary wallet already exists for this user" }, 400)
                }

                // Check if user exists
                const user = await userRepo.findByWalletAddress(primary_wallet)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                // Check if wallet already belongs to another user
                const existingUser = await userRepo.findByWalletAddress(wallet_address)
                if (existingUser && existingUser.id !== user.id) {
                    return c.json({ ok: false, error: "Wallet already registered to another user" }, 409)
                }

                const success = await userRepo.addWallet(user.id, wallet_address)
                if (!success) {
                    return c.json({ ok: false, error: "Wallet already exists for this user" }, 409)
                }

                // Get updated user with wallets
                const updatedUser = await userRepo.findById(user.id, true)
                return c.json({ ok: true, data: updatedUser }, 200)
            } catch (err) {
                console.error(`Error adding wallet to user with wallet ${c.req.param("primary_wallet")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    // ====================================================================================================
    // User Wallet Resource Routes (Set Primary, Remove)

    /**
     * Set a wallet as primary for a user by user ID.
     * PATCH /users/:id/wallets/primary
     * Requires ownership - only the user can manage their own wallets
     * @security BearerAuth
     */
    .patch(
        "/:id/wallets/primary",
        requireAuth,
        requireOwnership("id", "id"),
        UserWalletSetPrimaryByIdDescription,
        UserIdParamValidation,
        UserWalletValidation,
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                const { wallet_address } = c.req.valid("json")
                const { userRepo } = c.get("repos")

                // Check if user exists
                const userId = id as UserTableId
                const user = await userRepo.findById(userId)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }
                if (user.primary_wallet === wallet_address) {
                    return c.json({ ok: false, error: "Wallet is already primary" }, 400)
                }

                const success = await userRepo.setWalletAsPrimary(userId, wallet_address)
                if (!success) {
                    return c.json({ ok: false, error: "Wallet not found for this user" }, 404)
                }

                // Get updated user with wallets
                const updatedUser = await userRepo.findById(userId, true)
                return c.json({ ok: true, data: updatedUser }, 200)
            } catch (err) {
                console.error(`Error setting primary wallet for user ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Set a wallet as primary for a user by primary wallet address.
     * PATCH /users/pw/:primary_wallet/wallets/primary
     * Requires ownership - only the user can manage their own wallets
     * @security BearerAuth
     */
    .patch(
        "/pw/:primary_wallet/wallets/primary",
        requireAuth,
        requireOwnership("primary_wallet", "primary_wallet"),
        UserWalletSetPrimaryByPrimaryWalletDescription,
        PrimaryWalletParamValidation,
        UserWalletValidation,
        async (c) => {
            try {
                const { primary_wallet } = c.req.valid("param")
                const { wallet_address } = c.req.valid("json")
                const { userRepo } = c.get("repos")

                if (primary_wallet === wallet_address) {
                    return c.json({ ok: false, error: "Primary wallet cannot be set as primary" }, 400)
                }

                // Check if user exists
                const user = await userRepo.findByWalletAddress(primary_wallet)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }
                if (user.primary_wallet === wallet_address) {
                    return c.json({ ok: false, error: "Wallet is already primary" }, 400)
                }

                const success = await userRepo.setWalletAsPrimary(user.id, wallet_address)
                if (!success) {
                    return c.json({ ok: false, error: "Wallet not found for this user" }, 404)
                }

                // Get updated user with wallets
                const updatedUser = await userRepo.findById(user.id, true)
                return c.json({ ok: true, data: updatedUser }, 200)
            } catch (err) {
                console.error(
                    `Error setting primary wallet for user with wallet ${c.req.param("primary_wallet")}:`,
                    err,
                )
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Remove a wallet from a user by user ID.
     * DELETE /users/:id/wallets
     * Requires ownership - only the user can manage their own wallets
     * @security BearerAuth
     */
    .delete(
        "/:id/wallets",
        requireAuth,
        requireOwnership("id", "id"),
        UserWalletRemoveByIdDescription,
        UserIdParamValidation,
        UserWalletValidation,
        async (c) => {
            try {
                const { id } = c.req.valid("param")
                const { wallet_address } = c.req.valid("json")
                const { userRepo } = c.get("repos")

                // Check if user exists
                const userId = id as UserTableId
                const user = await userRepo.findById(userId)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                if (user.primary_wallet === wallet_address) {
                    return c.json({ ok: false, error: "Cannot remove primary wallet" }, 400)
                }

                const success = await userRepo.removeWallet(userId, wallet_address)
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
                const updatedUser = await userRepo.findById(userId, true)
                return c.json({ ok: true, data: updatedUser }, 200)
            } catch (err) {
                console.error(`Error removing wallet from user ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Remove a wallet from a user by primary wallet address.
     * DELETE /users/pw/:primary_wallet/wallets
     * Requires ownership - only the user can manage their own wallets
     * @security BearerAuth
     */
    .delete(
        "/pw/:primary_wallet/wallets",
        requireAuth,
        requireOwnership("primary_wallet", "primary_wallet"),
        UserWalletRemoveByPrimaryWalletDescription,
        PrimaryWalletParamValidation,
        UserWalletValidation,
        async (c) => {
            try {
                const { primary_wallet } = c.req.valid("param")
                const { wallet_address } = c.req.valid("json")
                const { userRepo } = c.get("repos")

                if (primary_wallet === wallet_address) {
                    return c.json({ ok: false, error: "Cannot remove primary wallet" }, 400)
                }

                // Check if user exists
                const user = await userRepo.findByWalletAddress(primary_wallet)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                if (user.primary_wallet === wallet_address) {
                    return c.json({ ok: false, error: "Cannot remove primary wallet" }, 400)
                }

                const success = await userRepo.removeWallet(user.id, wallet_address)
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
                const updatedUser = await userRepo.findById(user.id, true)
                return c.json({ ok: true, data: updatedUser }, 200)
            } catch (err) {
                console.error(`Error removing wallet from user with wallet ${c.req.param("primary_wallet")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Get all guilds a user belongs to.
     * GET /users/:id/guilds
     */
    .get("/:id/guilds", UserGuildsListDescription, UserIdParamValidation, async (c) => {
        try {
            const { id } = c.req.valid("param")
            const { guildRepo, userRepo } = c.get("repos")

            // Check if user exists
            const userId = id as UserTableId
            const user = await userRepo.findById(userId)
            if (!user) {
                return c.json({ ok: false, error: "User not found" }, 404)
            }

            const guilds = await guildRepo.getUserGuilds(userId)
            return c.json({ ok: true, data: guilds }, 200)
        } catch (err) {
            console.error(`Error fetching guilds for user ${c.req.param("id")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })
