import { Hono } from "hono"
import type { ExecuteOutput, PendingHappyTxOutput, StateRequestOutput, SubmitOutput } from "#lib/client"
import { estimateGas } from "#lib/handlers/submitter/estimateGas"
import { execute } from "#lib/handlers/submitter/execute"
import { pendingByAccount } from "#lib/handlers/submitter/pendingByAccount"
import { receiptByHash } from "#lib/handlers/submitter/receiptByHash"
import { stateByHash } from "#lib/handlers/submitter/stateByHash"
import { submit } from "#lib/handlers/submitter/submit"
import { serializeBigInt } from "#lib/utils/serializeBigInt"
import * as estimateGasRoute from "./openApi/estimateGas"
import * as executeRoute from "./openApi/execute"
import * as pendingByAccountRoute from "./openApi/pendingByAccount"
import * as receiptByHashRoute from "./openApi/receiptByHash"
import * as stateByHashRoute from "./openApi/stateByHash"
import * as submitRoute from "./openApi/submit"

export default new Hono()
    .post("/simulate", estimateGasRoute.description, estimateGasRoute.validation, async (c) => {
        const input = c.req.valid("json")
        const output = await estimateGas(input)
        return c.json(serializeBigInt(output))
    })
    .post("/execute", executeRoute.description, executeRoute.validation, async (c) => {
        const input = c.req.valid("json")
        const output = await execute(input)
        if (output.isErr()) return c.json(serializeBigInt(output.error), 422)
        return c.json(serializeBigInt(output.value satisfies ExecuteOutput))
    })
    .post("/submit", submitRoute.description, submitRoute.validation, async (c) => {
        const input = c.req.valid("json")
        const output = await submit(input)
        if (output.isErr()) return c.json(serializeBigInt(output.error), 422)
        return c.json(serializeBigInt(output.value satisfies SubmitOutput))
    })
    .get("/state/:hash", stateByHashRoute.description, stateByHashRoute.validation, async (c) => {
        const input = c.req.valid("param")
        const output = await stateByHash(input)
        if (output.isErr()) return c.json(serializeBigInt(output.error), 422)
        return c.json(serializeBigInt(output.value satisfies StateRequestOutput))
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
            if (output.isErr()) return c.json(serializeBigInt(output.error), 422)
            return c.json(serializeBigInt(output.value satisfies StateRequestOutput))
        },
    )
    .get("/pending/:account", pendingByAccountRoute.description, pendingByAccountRoute.validation, async (c) => {
        const input = c.req.valid("param")
        const output = await pendingByAccount(input)
        if (output.isErr()) return c.json(serializeBigInt(output.error), 422)
        return c.json(serializeBigInt(output.value satisfies PendingHappyTxOutput))
    })
