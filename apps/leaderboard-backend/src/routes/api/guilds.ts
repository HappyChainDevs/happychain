import { Hono } from "hono"
import { cors } from "hono/cors"
import { prettyJSON } from "hono/pretty-json"

const guildsApi = new Hono()
guildsApi.use("*", cors())
guildsApi.use(prettyJSON())

guildsApi.get("/", async (c) => {
    // List guilds - implementation placeholder
    return c.json({ message: "List guilds - not implemented" }, 501)
})

guildsApi.post("/", async (c) => {
    // Create guild - implementation placeholder
    return c.json({ message: "Create guild - not implemented" }, 501)
})

export { guildsApi }
