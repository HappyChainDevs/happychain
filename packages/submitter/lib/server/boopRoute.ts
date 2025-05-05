import { Hono } from "hono"
import { executeDescription, executeValidation } from "#lib/handlers/execute"
import { execute } from "#lib/handlers/execute/execute"
import { getPending, getPendingDescription, getPendingValidation } from "#lib/handlers/getPending"
import { getState, getStateDescription, getStateValidation } from "#lib/handlers/getState"
import { simulate, simulateDescription, simulateValidation } from "#lib/handlers/simulate"
import { submit, submitDescription, submitValidation } from "#lib/handlers/submit"
import {
    waitForReceipt,
    waitForReceiptDescription,
    waitForReceiptParamValidation,
    waitForReceiptQueryValidation,
} from "#lib/handlers/waitForReceipt"
import { makeResponse } from "#lib/server/makeResponse"

export default new Hono()
    .post(
        "/simulate", //
        simulateDescription,
        simulateValidation,
        async (c) => {
            const input = c.req.valid("json")
            const [response, code] = makeResponse(await simulate(input))
            return c.json(response, code)
        },
    )
    .post(
        "/submit", //
        submitDescription,
        submitValidation,
        async (c) => {
            const input = c.req.valid("json")
            const [response, code] = makeResponse(await submit(input))
            return c.json(response, code)
        },
    )
    .post(
        "/execute", //
        executeDescription,
        executeValidation,
        async (c) => {
            const input = c.req.valid("json")
            const [response, code] = makeResponse(await execute(input))
            return c.json(response, code)
        },
    )
    .get(
        "/state/:hash", //
        getStateDescription,
        getStateValidation,
        async (c) => {
            const input = c.req.valid("param")
            const output = await getState(input)
            const [response, code] = makeResponse(output)
            return c.json(response, code)
        },
    )
    .get(
        "/receipt/:hash", //
        waitForReceiptDescription,
        waitForReceiptParamValidation,
        waitForReceiptQueryValidation,
        async (c) => {
            const { hash } = c.req.valid("param")
            const { timeout } = c.req.valid("query")
            const output = await waitForReceipt({ hash, timeout })
            const [response, code] = makeResponse(output)
            return c.json(response, code)
        },
    )
    .get(
        "/pending/:account", //
        getPendingDescription,
        getPendingValidation,
        async (c) => {
            const input = c.req.valid("param")
            const output = await getPending(input)
            const [response, code] = makeResponse(output)
            return c.json(response, code)
        },
    )
