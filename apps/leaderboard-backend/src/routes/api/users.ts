import type { Address } from "@happy.tech/common"
import { Hono } from "hono"

import { db } from "../../db/driver"
import type { User } from "../../db/types"
import { UserRepository } from "../../repository/UserRepository"

const userRepo = new UserRepository(db)
const usersApi = new Hono()

// GET /users
usersApi.get("/", async (c) => {
    try {
        const query = c.req.query()
        const criteria: Partial<User> = {}
        if (query.id !== undefined) criteria.id = Number(query.id)
        if (query.happy_wallet !== undefined) criteria.happy_wallet = query.happy_wallet as Address
        if (query.username !== undefined) criteria.username = String(query.username)
        if (query.guild_id !== undefined) criteria.guild_id = Number(query.guild_id)
        if (query.created_at !== undefined) criteria.created_at = new Date(String(query.created_at))
        const users = await userRepo.find(criteria)
        return c.json(users)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

// POST /users
usersApi.post("/", async (c) => {
    try {
        const body = await c.req.json()
        const { happy_wallet, username, guild_id, created_at } = body
        if (!happy_wallet || !username || !created_at) {
            return c.json({ error: "Missing required fields" }, 400)
        }
        const newUser = await userRepo.create({
            happy_wallet,
            username,
            guild_id: guild_id === undefined ? null : guild_id,
            created_at,
        })
        return c.json(newUser, 201)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

export { usersApi }
