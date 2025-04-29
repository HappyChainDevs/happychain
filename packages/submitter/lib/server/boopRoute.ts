import { Hono } from "hono"
import type { PendingBoopOutput, StateRequestOutput } from "#lib/client"
import { execute } from "#lib/handlers/boop/execute"
import { pendingByAccount } from "#lib/handlers/boop/pendingByAccount"
import { receiptByHash } from "#lib/handlers/boop/receiptByHash"
import { simulate } from "#lib/handlers/boop/simulate"
import { stateByHash } from "#lib/handlers/boop/stateByHash"
import { submit } from "#lib/handlers/boop/submit"
import { makeResponse, makeResponseOld } from "#lib/routes/api/makeResponse"
import * as executeRoute from "./openApi/execute"
import * as pendingByAccountRoute from "./openApi/pendingByAccount"
import * as receiptByHashRoute from "./openApi/receiptByHash"
import * as simulationRoute from "./openApi/simulate"
import * as stateByHashRoute from "./openApi/stateByHash"
import * as submitRoute from "./openApi/submit"

export default new Hono()
    .post(
        "/simulate", //
        simulationRoute.description,
        simulationRoute.validation,
        async (c) => {
            const input = c.req.valid("json")
            const [response, code] = makeResponse(await simulate(input))
            return c.json(response, code)
        },
    )
    .post(
        "/submit", //
        submitRoute.description,
        submitRoute.validation,
        async (c) => {
            const input = c.req.valid("json")
            const [response, code] = makeResponse(await submit(input))
            return c.json(response, code)
        },
    )
    .post(
        "/execute", //
        executeRoute.description,
        executeRoute.validation,
        async (c) => {
            const input = c.req.valid("json")
            const [response, code] = makeResponse(await execute(input))
            return c.json(response, code)
        },
    )
    .get(
        "/state/:hash", //
        stateByHashRoute.description,
        stateByHashRoute.validation,
        async (c) => {
            const input = c.req.valid("param")
            const output = await stateByHash(input)
            const [response, code] = makeResponseOld<StateRequestOutput>(output)
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
            const [response, code] = makeResponseOld<StateRequestOutput>(output)
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
            const [response, code] = makeResponseOld<PendingBoopOutput>(output)
            return c.json(response, code)
        },
    )
