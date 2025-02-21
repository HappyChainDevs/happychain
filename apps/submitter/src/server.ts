import { Hono } from "hono"
import { logger } from "./logger"

export const app = new Hono()

app.get("/", (c) => c.text("Welcome to Happychain"))

app.notFound((c) => c.text("These aren't the droids you're looking for", 404))
app.onError((err, c) => {
    logger.warn(err)
    return c.json({ message: "Something Happened" }, 500)
})

export type AppType = typeof app
