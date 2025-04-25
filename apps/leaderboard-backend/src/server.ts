import { Hono } from "hono"
import { cors } from "hono/cors"
import { prettyJSON } from "hono/pretty-json"

import { type Repositories, repositories } from "./repositories"
import { gamesApi } from "./routes/api/gamesRoutes"
import { leaderboardApi } from "./routes/api/leaderboardRoutes"
import { usersApi } from "./routes/api/usersRoutes"

declare module "hono" {
    interface ContextVariableMap {
        repos: Repositories
    }
}

const app = new Hono()

app.use(cors())
app.use(prettyJSON())

// Middleware to inject repositories into context
app.use("*", async (c, next) => {
    c.set("repos", repositories)
    await next()
})

app.get("/", (c) => c.text("Leaderboard API"))
app.route("/users", usersApi)
app.route("/games", gamesApi)
app.route("/leaderboard", leaderboardApi)
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404))

export type AppType = typeof app
export { app }
