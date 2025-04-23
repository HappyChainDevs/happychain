import { Hono } from "hono"
import { db } from "./db/driver"
import type { User } from "./db/types"
import { initDb } from "./initDB"
import { UserRepository } from "./repository/UserRepository"

const app = new Hono()
const userRepo = new UserRepository(db)

// GET /users
app.get("/users", async (c) => {
    try {
        const query = c.req.query()
        const criteria: Partial<User> = {}
        if (query.id !== undefined) criteria.id = Number(query.id)
        if (query.happy_wallet !== undefined) criteria.happy_wallet = String(query.happy_wallet)
        if (query.name !== undefined) criteria.name = String(query.name)
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
app.post("/users", async (c) => {
    try {
        const body = await c.req.json()
        const { happy_wallet, name, guild_id, created_at } = body
        if (!happy_wallet || !name || !created_at) {
            return c.json({ error: "Missing required fields" }, 400)
        }
        const newUser = await userRepo.create({
            happy_wallet,
            name,
            guild_id: guild_id === undefined ? null : guild_id,
            created_at,
        })
        return c.json(newUser, 201)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

export async function startServer(port: number) {
    await initDb()
    console.log(`Server running on port ${port}`)
    return Bun.serve({
        port,
        fetch: app.fetch,
    })
}
