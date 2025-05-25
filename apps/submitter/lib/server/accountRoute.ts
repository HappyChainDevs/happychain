import { Hono } from "hono"
import {
    createAccount,
    createAccountBodyValidation,
    createAccountDescription,
    createAccountOutputValidation,
} from "#lib/handlers/createAccount"
import { makeResponse } from "#lib/server/makeResponse"
import { validateOutput } from "#lib/utils/validation/helpers"

export default new Hono().post("/create", createAccountDescription, createAccountBodyValidation, async (c) => {
    const input = await c.req.valid("json")
    const output = await createAccount(input)
    validateOutput(output, createAccountOutputValidation)
    const [body, code] = makeResponse(output)
    return c.json(body, code)
})
