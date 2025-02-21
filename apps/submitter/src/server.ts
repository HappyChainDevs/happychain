import { Hono } from "hono"
import { logger } from "./logger"
import accountsApi from "./routes/api/accounts"

export const app = new Hono().route("/api/v1/accounts", accountsApi)

app.notFound((c) => c.text("These aren't the droids you're looking for", 404))
app.onError((err, c) => {
    logger.warn(err)
    return c.json({ message: "Something Happened" }, 500)
})

export type AppType = typeof app
