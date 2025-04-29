import { Hono } from "hono"
import { create } from "#lib/handlers/accounts/create.ts"
import { makeResponse } from "#lib/routes/api/makeResponse"
import * as createRoute from "./openApi/create"

export default new Hono().post("/create", createRoute.description, createRoute.validation, async (c) => {
    const input = await c.req.valid("json")
    const [output, code] = makeResponse(await create(input))
    return c.json(output, code)
})
