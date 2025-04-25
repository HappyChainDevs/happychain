import { Hono } from "hono"

const guildsApi = new Hono()

const guildRoutes = guildsApi
    .get("/", async (c) => {
        // List guilds - implementation placeholder
        return c.json({ message: "List guilds - not implemented" }, 501)
    })
    .post("/", async (c) => {
        // Create guild - implementation placeholder
        return c.json({ message: "Create guild - not implemented" }, 501)
    })

export type GuildRoutesType = typeof guildRoutes
export { guildsApi }
