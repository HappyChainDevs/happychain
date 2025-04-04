import { Hono } from "hono"
import type { Result } from "neverthrow"
import type { ExecuteOutput, PendingHappyTxOutput, StateRequestOutput, SubmitOutput } from "#lib/client"
import { HappyBaseError } from "#lib/errors/happy-base-error"
import { execute } from "#lib/handlers/submitter/execute"
import { pendingByAccount } from "#lib/handlers/submitter/pendingByAccount"
import { receiptByHash } from "#lib/handlers/submitter/receiptByHash"
import { simulate } from "#lib/handlers/submitter/simulate"
import { stateByHash } from "#lib/handlers/submitter/stateByHash"
import { submit } from "#lib/handlers/submitter/submit"
import { serializeBigInt } from "#lib/utils/serializeBigInt"
import * as estimateGasRoute from "./openApi/estimateGas"
import * as executeRoute from "./openApi/execute"
import * as pendingByAccountRoute from "./openApi/pendingByAccount"
import * as receiptByHashRoute from "./openApi/receiptByHash"
import * as stateByHashRoute from "./openApi/stateByHash"
import * as submitRoute from "./openApi/submit"

function makeResponse<TOk>(output: Result<TOk, unknown>) {
    if (output.isOk()) return [serializeBigInt(output.value), 200] as const

    const error =
        output.error instanceof HappyBaseError //
            ? output.error.getResponseData()
            : output.error // unknown error

    return [serializeBigInt(error), 422] as const
}

export default new Hono()
    .post(
        "/simulate", //
        estimateGasRoute.description,
        estimateGasRoute.validation,
        async (c) => {
            const input = c.req.valid("json")
            const output = await simulate(input)
            return c.json(serializeBigInt(output))
        },
    )
    .post(
        "/execute", //
        executeRoute.description,
        executeRoute.validation,
        async (c) => {
            const input = c.req.valid("json")
            const output = await execute(input)
            const [response, code] = makeResponse<ExecuteOutput>(output)
            return c.json(response, code)
        },
    )
    .post("/submit", submitRoute.description, submitRoute.validation, async (c) => {
        const input = c.req.valid("json")
        const output = await submit(input)
        const [response, code] = makeResponse<SubmitOutput>(output)
        return c.json(response, code)
    })
    .get(
        "/state/:hash", //
        stateByHashRoute.description,
        stateByHashRoute.validation,
        async (c) => {
            const input = c.req.valid("param")
            const output = await stateByHash(input)
            const [response, code] = makeResponse<StateRequestOutput>(output)
            return c.json(response, code)
        },
    )
    .get(
        "/receipt/:hash", //
        receiptByHashRoute.description,
        receiptByHashRoute.paramValidation,
        receiptByHashRoute.queryValidation,
        async (c) => {
            const { hash } = c.req.valid("param")
            const { timeout } = c.req.valid("query")
            const output = await receiptByHash({ hash, timeout })
            const [response, code] = makeResponse<StateRequestOutput>(output)
            return c.json(response, code)
        },
    )
    .get(
        "/pending/:account", //
        pendingByAccountRoute.description,
        pendingByAccountRoute.validation,
        async (c) => {
            const input = c.req.valid("param")
            const output = await pendingByAccount(input)
            const [response, code] = makeResponse<PendingHappyTxOutput>(output)
            return c.json(response, code)
        },
    )
