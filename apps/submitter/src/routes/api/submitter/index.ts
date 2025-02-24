import { Hono } from "hono"
import { estimateGas } from "#src/handlers/submitter/estimateGas"
import { execute } from "#src/handlers/submitter/execute"
import { pendingByAccount } from "#src/handlers/submitter/pendingByAccount"
import { receiptByHash } from "#src/handlers/submitter/receiptByHash"
import { stateByHash } from "#src/handlers/submitter/stateByHash"
import { submit } from "#src/handlers/submitter/submit"
import { serializeBigInt } from "#src/utils/bigint-lossy"
import * as estimateGasRoute from "./openApi/estimateGas"
import * as executeRoute from "./openApi/execute"
import * as pendingByAccountRoute from "./openApi/pendingByAccount"
import * as receiptByHashRoute from "./openApi/receiptByHash"
import * as stateByHashRoute from "./openApi/stateByHash"
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
    .get("/state/:hash", stateByHashRoute.description, stateByHashRoute.validation, async (c) => {
        const input = c.req.valid("param")
        const output = await stateByHash(input)
        return c.json(serializeBigInt(output))
    })
    .get(
        "/receipt/:hash",
        receiptByHashRoute.description,
        receiptByHashRoute.paramValidation,
        receiptByHashRoute.queryValidation,
        async (c) => {
            const { hash } = c.req.valid("param")
            const { timeout } = c.req.valid("query")
            const output = await receiptByHash({ hash, timeout })
            return c.json(serializeBigInt(output))
        },
    )
    .get("/pending/:account", pendingByAccountRoute.description, pendingByAccountRoute.validation, async (c) => {
        const input = c.req.valid("param")
        const output = await pendingByAccount(input)
        return c.json(serializeBigInt(output))
    })
