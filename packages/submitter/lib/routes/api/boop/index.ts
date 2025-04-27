import { serializeBigInt } from "@happy.tech/common"
import { Hono } from "hono"
import type { Result } from "neverthrow"
import type { ExecuteOutput, PendingBoopOutput, StateRequestOutput, SubmitOutput } from "#lib/client"
import { HappyBaseError } from "#lib/errors/happy-base-error"
import { execute } from "#lib/handlers/boop/execute"
import { pendingByAccount } from "#lib/handlers/boop/pendingByAccount"
import { receiptByHash } from "#lib/handlers/boop/receiptByHash"
import { simulateFromRoute } from "#lib/handlers/boop/simulate"
import { stateByHash } from "#lib/handlers/boop/stateByHash"
import { submit } from "#lib/handlers/boop/submit"
import * as executeRoute from "./openApi/execute"
import * as pendingByAccountRoute from "./openApi/pendingByAccount"
import * as receiptByHashRoute from "./openApi/receiptByHash"
import * as simulationRoute from "./openApi/simulate"
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
        simulationRoute.description,
        simulationRoute.validation,
        async (c) => {
            const input = c.req.valid("json")
            const [response, code] = await simulateFromRoute(input)
            return c.json(response, code)
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
            const [response, code] = makeResponse<PendingBoopOutput>(output)
            return c.json(response, code)
        },
    )
