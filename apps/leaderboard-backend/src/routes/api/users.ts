import { Hono } from "hono"

import { db } from "../../db/driver"
import type { User } from "../../db/types"
import { UserRepository } from "../../repository/UserRepository"

const userRepo = new UserRepository(db)
const usersApi = new Hono()

import { zValidator } from "@hono/zod-validator"
import { UserCreateRequestSchema, UserQuerySchema } from "../../validation/schema/user"

// GET /users
usersApi.get("/", zValidator("query", UserQuerySchema), async (c) => {
    try {
        const query = c.req.valid("query")
        // Convert types as needed for repository
        const criteria: Partial<User> = {}
        if (query.happy_wallet) criteria.happy_wallet = query.happy_wallet
        if (query.username) criteria.username = query.username
        if (query.guild_id) criteria.guild_id = Number(query.guild_id)
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
        const body = c.req.valid("json")
        const { happy_wallet, username, guild_id } = body
        const newUser = await userRepo.create({
            happy_wallet,
            username,
            guild_id: guild_id === undefined ? null : Number(guild_id),
            created_at: new Date().toISOString(),
        })
        return c.json(newUser, 201)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

export { usersApi }
