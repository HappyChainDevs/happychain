import { Hono } from "hono"
import { cors } from "hono/cors"
import { prettyJSON } from "hono/pretty-json"

import { gamesApi } from "./routes/api/games"
import { leaderboardApi } from "./routes/api/leaderboard"
import { usersApi } from "./routes/api/users"

const app = new Hono()

app.use(cors())
app.use(prettyJSON())

app.get("/", (c) => c.text("Leaderboard API"))
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404))

app.route("/users", usersApi)
app.route("/games", gamesApi)
app.route("/leaderboard", leaderboardApi)

export type AppType = typeof app
export { app }
