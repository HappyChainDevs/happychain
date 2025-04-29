import { Hono } from "hono"
import { cors } from "hono/cors"
import { prettyJSON } from "hono/pretty-json"

import { type Repositories, repositories } from "./repositories"
import gamesApi from "./routes/api/gamesRoutes"
import guildsApi from "./routes/api/guildsRoutes"
import leaderboardApi from "./routes/api/leaderboardRoutes"
import usersApi from "./routes/api/usersRoutes"

declare module "hono" {
    interface ContextVariableMap {
        repos: Repositories
    }
}

const app = new Hono()
    .use(cors())
    .use(prettyJSON())
    .use("*", async (c, next) => {
        c.set("repos", repositories)
        await next()
    })
    .get("/", (c) => c.text("Leaderboard API"))
    .route("/users", usersApi)
    .route("/guilds", guildsApi)
    .route("/games", gamesApi)
    .route("/leaderboards", leaderboardApi)
    .notFound((c) => c.json({ message: "Not Found", ok: false }, 404))

export type AppType = typeof app
export { app }
