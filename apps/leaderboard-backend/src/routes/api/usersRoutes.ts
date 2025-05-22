import { Hono } from "hono"
import { ActionType, requireAuth, userAction } from "../../auth"
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
            console.error(`Error fetching user with wallet ${c.req.param("primary_wallet")}:`, err)
            return c.json({ ok: false, error: "Internal Server Error" }, 500)
        }
    })

    /**
     * Update user details by primary wallet address.
     * PATCH /users/pw/:primary_wallet
     * Requires ownership - only the user can update their own profile
     */
    .patch(
        "/pw/:primary_wallet",
        requireAuth,
        userAction(ActionType.UPDATE),
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
     * Delete a user by primary wallet address and all associated data.
     * DELETE /users/pw/:primary_wallet
     * Requires ownership - only the user can delete their own profile
     */
    .delete(
        "/pw/:primary_wallet",
        requireAuth,
        userAction(ActionType.DELETE),
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
    // User Wallet Routes (by Primary Wallet Address)

    /**
     * Get wallets for a user by primary wallet address.
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
     * Add a wallet address to a user by primary wallet address.
     * POST /users/pw/:primary_wallet/wallets
     * Requires ownership - only the user can add wallets to their own profile
     */
    .post(
        "/pw/:primary_wallet/wallets",
        requireAuth,
        userAction(ActionType.UPDATE),
        UserWalletAddByPrimaryWalletDescription,
        PrimaryWalletParamValidation,
        UserWalletValidation,
        async (c) => {
            try {
                const { primary_wallet } = c.req.valid("param")
                const { wallet_address } = c.req.valid("json")
                const { userRepo } = c.get("repos")

                // Check if user exists
                const user = await userRepo.findByWalletAddress(primary_wallet)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                // Check if wallet address is already registered to any user
                const existingUser = await userRepo.findByWalletAddress(wallet_address)
                if (existingUser) {
                    return c.json({ ok: false, error: "Wallet address already registered to another user" }, 409)
                }

                const walletAdded = await userRepo.addWallet(user.id, wallet_address)
                if (!walletAdded) {
                    return c.json({ ok: false, error: "Failed to add wallet" }, 500)
                }

                const updatedUser = await userRepo.findById(user.id)
                return c.json({ ok: true, data: updatedUser }, 201)
            } catch (err) {
                console.error(`Error adding wallet for user with wallet ${c.req.param("primary_wallet")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Set a wallet as primary for a user by primary wallet address.
     * PATCH /users/pw/:primary_wallet/wallets/primary
     * Requires ownership - only the user can update their own wallets
     */
    .patch(
        "/pw/:primary_wallet/wallets/primary",
        requireAuth,
        userAction(ActionType.UPDATE),
        UserWalletSetPrimaryByPrimaryWalletDescription,
        PrimaryWalletParamValidation,
        UserWalletValidation,
        async (c) => {
            try {
                const { primary_wallet } = c.req.valid("param")
                const { wallet_address } = c.req.valid("json")
                const { userRepo } = c.get("repos")

                // Check if user exists
                const user = await userRepo.findByWalletAddress(primary_wallet)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                // Check if the wallet address belongs to the user
                const wallets = await userRepo.getUserWallets(user.id)
                if (!wallets.some((wallet) => wallet.wallet_address === wallet_address)) {
                    return c.json({ ok: false, error: "Wallet address does not belong to this user" }, 404)
                }

                const walletSetToPrimary = await userRepo.setWalletAsPrimary(user.id, wallet_address)
                if (!walletSetToPrimary) {
                    return c.json({ ok: false, error: "Failed to set wallet as primary" }, 500)
                }

                const updatedUser = await userRepo.findById(user.id)
                return c.json({ ok: true, data: updatedUser }, 201)
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
     * Remove a wallet address from a user by primary wallet address.
     * DELETE /users/pw/:primary_wallet/wallets
     * Requires ownership - only the user can remove wallets from their own profile
     */
    .delete(
        "/pw/:primary_wallet/wallets",
        requireAuth,
        userAction(ActionType.UPDATE),
        UserWalletRemoveByPrimaryWalletDescription,
        PrimaryWalletParamValidation,
        UserWalletValidation,
        async (c) => {
            try {
                const { primary_wallet } = c.req.valid("param")
                const { wallet_address } = c.req.valid("json")
                const { userRepo } = c.get("repos")

                // Check if user exists
                const user = await userRepo.findByWalletAddress(primary_wallet)
                if (!user) {
                    return c.json({ ok: false, error: "User not found" }, 404)
                }

                // Cannot remove primary wallet
                if (user.primary_wallet === wallet_address) {
                    return c.json(
                        { ok: false, error: "Cannot remove primary wallet, set another wallet as primary first" },
                        400,
                    )
                }

                // Check if the wallet address belongs to the user
                const wallets = await userRepo.getUserWallets(user.id)
                if (!wallets.some((wallet) => wallet.wallet_address === wallet_address)) {
                    return c.json({ ok: false, error: "Wallet address does not belong to this user" }, 404)
                }

                const walletRemoved = await userRepo.removeWallet(user.id, wallet_address)
                if (!walletRemoved) {
                    return c.json({ ok: false, error: "Failed to remove wallet" }, 500)
                }

                const updatedUser = await userRepo.findById(user.id)
                return c.json({ ok: true, data: updatedUser }, 200)
            } catch (err) {
                console.error(`Error removing wallet for user with wallet ${c.req.param("primary_wallet")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

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
     */
    .patch(
        "/:id",
        requireAuth,
        userAction(ActionType.UPDATE),
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
     */
    .delete(
        "/:id",
        requireAuth,
        userAction(ActionType.DELETE),
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
    // User Wallet Routes (by ID)

    /**
     * Get wallets for a user by ID.
     * GET /users/:id/wallets
     */
    .get("/:id/wallets", UserWalletsGetByIdDescription, UserIdParamValidation, async (c) => {
        try {
            const { id } = c.req.valid("param")
            const { userRepo } = c.get("repos")

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
     * Add a wallet address to a user by ID.
     * POST /users/:id/wallets
     * Requires ownership - only the user can add wallets to their own profile
     */
    .post(
        "/:id/wallets",
        requireAuth,
        userAction(ActionType.UPDATE),
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

                // Check if wallet address is already registered to any user
                const existingUser = await userRepo.findByWalletAddress(wallet_address)
                if (existingUser) {
                    return c.json({ ok: false, error: "Wallet address already registered to another user" }, 409)
                }

                const walletAdded = await userRepo.addWallet(userId, wallet_address)
                if (!walletAdded) {
                    return c.json({ ok: false, error: "Failed to add wallet" }, 500)
                }

                const updatedUser = await userRepo.findById(userId)
                return c.json({ ok: true, data: updatedUser }, 201)
            } catch (err) {
                console.error(`Error adding wallet for user ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Set a wallet as primary for a user by ID.
     * PATCH /users/:id/wallets/primary
     * Requires ownership - only the user can update their own wallets
     */
    .patch(
        "/:id/wallets/primary",
        requireAuth,
        userAction(ActionType.UPDATE),
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

                // Check if the wallet address belongs to the user
                const wallets = await userRepo.getUserWallets(userId)
                if (!wallets.some((wallet) => wallet.wallet_address === wallet_address)) {
                    return c.json({ ok: false, error: "Wallet address does not belong to this user" }, 404)
                }

                const walletSetToPrimary = await userRepo.setWalletAsPrimary(userId, wallet_address)
                if (!walletSetToPrimary) {
                    return c.json({ ok: false, error: "Failed to set wallet as primary" }, 500)
                }

                const updatedUser = await userRepo.findById(userId)
                return c.json({ ok: true, data: updatedUser }, 201)
            } catch (err) {
                console.error(`Error setting primary wallet for user ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    /**
     * Remove a wallet address from a user by ID.
     * DELETE /users/:id/wallets
     * Requires ownership - only the user can remove wallets from their own profile
     */
    .delete(
        "/:id/wallets",
        requireAuth,
        userAction(ActionType.UPDATE),
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

                // Cannot remove primary wallet
                if (user.primary_wallet === wallet_address) {
                    return c.json(
                        { ok: false, error: "Cannot remove primary wallet, set another wallet as primary first" },
                        400,
                    )
                }

                // Check if the wallet address belongs to the user
                const wallets = await userRepo.getUserWallets(userId)
                if (!wallets.some((wallet) => wallet.wallet_address === wallet_address)) {
                    return c.json({ ok: false, error: "Wallet address does not belong to this user" }, 404)
                }

                const walletRemoved = await userRepo.removeWallet(userId, wallet_address)
                if (!walletRemoved) {
                    return c.json({ ok: false, error: "Failed to remove wallet" }, 500)
                }

                const updatedUser = await userRepo.findById(userId)
                return c.json({ ok: true, data: updatedUser }, 200)
            } catch (err) {
                console.error(`Error removing wallet for user ${c.req.param("id")}:`, err)
                return c.json({ ok: false, error: "Internal Server Error" }, 500)
            }
        },
    )

    // ====================================================================================================
    // Special User Routes

    /**
     * Get all guilds for a user by ID.
     * GET /users/:id/guilds
     */
    .get("/:id/guilds", UserGuildsListDescription, UserIdParamValidation, async (c) => {
        try {
            const { id } = c.req.valid("param")
            const { guildRepo, userRepo } = c.get("repos")

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
