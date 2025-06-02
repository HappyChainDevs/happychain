import { Hono } from "hono"
import {
    createAccount,
    createAccountBodyValidation,
    createAccountDescription,
    createAccountOutputValidation,
} from "#lib/handlers/createAccount"
import { makeResponse } from "#lib/server/makeResponse"
import { validateSerializedOutput } from "#lib/utils/validation/helpers"

export default new Hono().post("/create", createAccountDescription, createAccountBodyValidation, async (c) => {
    const input = c.req.valid("json")
    const output = await createAccount(input)
    console.log("await createAccount(input): \n", output)
    validateSerializedOutput(output, createAccountOutputValidation)
    const [body, code] = makeResponse(output)
    console.log("await makeResponse(output): \n", body)
    return c.json(body, code)
})
