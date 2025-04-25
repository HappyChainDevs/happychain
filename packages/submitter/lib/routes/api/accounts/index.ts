import { serializeBigInt } from "@happy.tech/common"
import { Hono } from "hono"
import { create } from "#lib/handlers/accounts/create"
import type { CreateAccountOutput } from "#lib/interfaces/account_create"
import * as createRoute from "./openApi/create"

export default new Hono().post("/create", createRoute.description, createRoute.validation, async (c) => {
    const input = await c.req.valid("json")
    const output = await create(input)
    if (output.isErr()) return c.json(serializeBigInt(output.error), 422)
    return c.json(serializeBigInt(output.value satisfies CreateAccountOutput))
})
