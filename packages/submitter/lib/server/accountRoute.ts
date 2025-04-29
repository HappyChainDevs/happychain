import { Hono } from "hono"
import { createAccount, createAccountDescription, createAccountValidation } from "#lib/handlers/createAccount"
import { makeResponse } from "#lib/server/makeResponse"

export default new Hono().post("/create", createAccountDescription, createAccountValidation, async (c) => {
    const input = await c.req.valid("json")
    const [output, code] = makeResponse(await createAccount(input))
    return c.json(output, code)
})
