import { createMiddleware } from "hono/factory"

export const serializeBigIntResponseMiddleware = createMiddleware(async (c, next) => {
    await next()

    // TODO: serialize all bigints => string
})
