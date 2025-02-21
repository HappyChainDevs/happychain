import { Hono } from "hono"
import { estimateGas } from "#src/handlers/submitter/estimateGas"
import { execute } from "#src/handlers/submitter/execute"
import { submit } from "#src/handlers/submitter/submit"
import { serializeBigInt } from "#src/utils/bigint-lossy"
import * as estimateGasRoute from "./openApi/estimateGas"
import * as executeRoute from "./openApi/execute"
import * as submitRoute from "./openApi/submit"

export default new Hono()
    .post("/estimateGas", estimateGasRoute.description, estimateGasRoute.validation, async (c) => {
        const input = c.req.valid("json")
        const output = await estimateGas(input)
        return c.json(serializeBigInt(output))
    })
    .post("/execute", executeRoute.description, executeRoute.validation, async (c) => {
        const input = c.req.valid("json")
        const output = await execute(input)
        return c.json(serializeBigInt(output))
    })
    .post("/submit", submitRoute.description, submitRoute.validation, async (c) => {
        const input = c.req.valid("json")
        const output = await submit(input)
        return c.json(serializeBigInt(output))
    })
