import type { Address } from "@happy.tech/common"

import { Hono } from "hono"
import { sessionMiddleware } from "hono-sessions"
import { BunSqliteStore } from "hono-sessions/bun-sqlite-store"
import { cors } from "hono/cors"
import { prettyJSON } from "hono/pretty-json"

import { db } from "./db/driver"
import type { User } from "./db/types"
import { initDb } from "./initDB"
import { UserRepository } from "./repository/UserRepository"

const userRepo = new UserRepository(db)
const app = new Hono()

app.use(cors())
app.use(prettyJSON())
app.use(
    sessionMiddleware({
        store: new BunSqliteStore(db),
    }),
)

app.get("/", (c) => c.text("Leaderboard API"))
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404))

// GET /users
app.get("/users", async (c) => {
    try {
        const query = c.req.query()
        const criteria: Partial<User> = {}
        if (query.id !== undefined) criteria.id = Number(query.id)
        if (query.happy_wallet !== undefined) criteria.happy_wallet = query.happy_wallet as Address
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
