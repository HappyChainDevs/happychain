import type { Address } from "@happy.tech/common"
import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { db } from "../../db/driver"
import type { GuildTableId, User } from "../../db/types"
import { UserRepository } from "../../repositories/UsersRepository"
import {
    UserCreateRequestSchema,
    UserDeleteRequestSchema,
    UserQuerySchema,
    UserUpdateRequestSchema,
} from "../../validation/schema/userSchema"

const userRepo = new UserRepository(db)
const usersApi = new Hono()

// GET /users
usersApi.get("/", zValidator("query", UserQuerySchema), async (c) => {
    try {
        const query = c.req.valid("query")
        const criteria: Partial<User> = {}
        if (query.happy_wallet) criteria.happy_wallet = query.happy_wallet
        if (query.username) criteria.username = query.username
        if (query.guild_id !== undefined && query.guild_id !== null) criteria.guild_id = query.guild_id as GuildTableId
        const users = await userRepo.find(criteria)
        return c.json(users)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

// POST /users
usersApi.post("/", zValidator("json", UserCreateRequestSchema), async (c) => {
    try {
        const { happy_wallet, username } = c.req.valid("json")
        const newUser = await userRepo.create({
            happy_wallet,
            username,
            created_at: new Date().toISOString(),
        })
        return c.json(newUser, 201)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

// PATCH /users/:happy_wallet
usersApi.patch("/:happy_wallet", zValidator("json", UserUpdateRequestSchema), async (c) => {
    try {
        const { happy_wallet } = c.req.param()
        const patch = c.req.valid("json")
        // Only allow updating username and/or guild_id
        const user = await userRepo.findByHappyWallet(happy_wallet as Address)
        if (!user) {
            return c.json({ error: "User not found" }, 404)
        }
        const updatedUser = await userRepo.update(user.id, patch)
        return c.json(updatedUser)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

// DELETE /users/:happy_wallet
usersApi.delete("/:happy_wallet", zValidator("param", UserDeleteRequestSchema), async (c) => {
    try {
        const { happy_wallet } = c.req.valid("param")
        const user = await userRepo.findByHappyWallet(happy_wallet as Address)
        if (!user) {
            return c.json({ error: "User not found" }, 404)
        }
        const deletedUser = await userRepo.delete(user.id)
        return c.json({ success: true, deleted_user: deletedUser })
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

export { usersApi }
