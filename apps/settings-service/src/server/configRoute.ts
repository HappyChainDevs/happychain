import { Hono } from "hono"
import { createConfig } from "../handlers/createConfig/createConfig"
import { createConfigDescription, createConfigValidation } from "../handlers/createConfig/validation"
import { listConfig } from "../handlers/listConfig.ts"
import { listConfigDescription, listConfigValidation } from "../handlers/listConfig.ts"
import { makeResponse } from "./makeResponse"

export default new Hono()
    .post("/create", createConfigDescription, createConfigValidation, async (c) => {
        const input = c.req.valid("json")
        const result = await createConfig(input)

        const [response, code] = makeResponse(result)
        return c.json(response, code)
    })
    .get("/list", listConfigDescription, listConfigValidation, async (c) => {
        const input = c.req.valid("query")
        const output = await listConfig(input)

        const [response, code] = makeResponse(output)
        return c.json(response, code)
    })
