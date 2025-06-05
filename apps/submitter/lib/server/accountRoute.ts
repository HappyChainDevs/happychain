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
    const input = c.req.valid("json")
    const output = await createAccount(input)
    const [body, code] = makeResponse(output)
    validateOutput(body, createAccountOutputValidation)
    return c.json(body, code)
})
