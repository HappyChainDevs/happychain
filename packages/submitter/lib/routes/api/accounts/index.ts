import { Hono } from "hono"
import { createFromRoute } from "#lib/handlers/accounts/create"
import * as createRoute from "./openApi/create"

export default new Hono().post("/create", createRoute.description, createRoute.validation, async (c) => {
    const input = await c.req.valid("json")
    const [output, code] = await createFromRoute(input)
    return c.json(output, code)
})
