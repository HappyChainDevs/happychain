import type { Address } from "@happy.tech/common"
import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import type { Guild, GuildTableId, UserTableId } from "../../db/types"
import {
    GuildCreateRequestSchema,
    GuildQuerySchema,
    GuildUpdateRequestSchema,
} from "../../validation/schema/guildSchema"

const guildsApi = new Hono()

// GET /guilds?{id,name,admin_id}
guildsApi.get("/", zValidator("query", GuildQuerySchema), async (c) => {
    try {
        const query = c.req.valid("query")
        const criteria: Partial<Guild> = {}

        if (query.id !== undefined) criteria.id = query.id as GuildTableId // branded type assertion
        if (query.name !== undefined) criteria.name = query.name
        if (query.admin_id !== undefined) criteria.admin_id = query.admin_id as UserTableId // branded type assertion

        const { guildRepo } = c.get("repos")
        const guilds = await guildRepo.find(criteria)
        return c.json(guilds)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

// POST /guilds
guildsApi.post("/", zValidator("json", GuildCreateRequestSchema), async (c) => {
    try {
        const { name, admin_wallet } = c.req.valid("json")
        const { guildRepo, userRepo } = c.get("repos")

        // Check uniqueness of name
        const existing = await guildRepo.findByName(name)
        if (existing) {
            return c.json({ error: "Guild name already exists" }, 400)
        }

        // Find admin user by wallet
        const adminUser = await userRepo.findByHappyWallet(admin_wallet as Address)
        if (!adminUser) {
            return c.json({ error: "Admin user not found for provided wallet" }, 400)
        }

        // Create
        const newGuild = await guildRepo.create({
            name,
            admin_id: adminUser.id,
            created_at: new Date().toISOString(),
        })
        return c.json(newGuild, 201)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

// GET /guilds/:id
guildsApi.get(":id", async (c) => {
    try {
        const id = Number(c.req.param("id"))
        if (Number.isNaN(id)) return c.json({ error: "Invalid guild id" }, 400)

        const { guildRepo } = c.get("repos")
        const guild = await guildRepo.findById(id as GuildTableId) // branded type assertion

        if (!guild) return c.json({ error: "Guild not found" }, 404)
        return c.json(guild)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

// PATCH /guilds/:id
guildsApi.patch(":id", zValidator("json", GuildUpdateRequestSchema), async (c) => {
    try {
        const id = Number(c.req.param("id"))
        if (Number.isNaN(id)) return c.json({ error: "Invalid guild id" }, 400)
        const patch = c.req.valid("json")

        const { guildRepo } = c.get("repos")
        const guild = await guildRepo.findById(id as GuildTableId) // branded type assertion
        if (!guild) return c.json({ error: "Guild not found" }, 404)

        // If name is being updated, check for uniqueness
        if (patch.name && patch.name !== guild.name) {
            const existing = await guildRepo.findByName(patch.name)
            if (existing) {
                return c.json({ error: "Guild name already exists" }, 400)
            }
        }

        const updatedGuild = await guildRepo.update(id as GuildTableId, patch)
        return c.json(updatedGuild)
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

// DELETE /guilds/:id
guildsApi.delete(":id", async (c) => {
    try {
        const id = Number(c.req.param("id"))
        if (Number.isNaN(id)) return c.json({ error: "Invalid guild id" }, 400)

        const { guildRepo } = c.get("repos")
        const deleted = await guildRepo.delete(id as GuildTableId)

        if (!deleted) return c.json({ error: "Guild not found" }, 404)
        return c.json({ success: true, deleted_guild: deleted })
    } catch (err) {
        console.error(err)
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

export type GuildRoutesType = typeof guildsApi
export { guildsApi }
