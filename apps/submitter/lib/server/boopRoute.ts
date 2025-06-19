import { Hono } from "hono"
import type { ResponseHeader } from "hono/utils/headers"
import { executeBodyValidation, executeDescription } from "#lib/handlers/execute"
import { execute } from "#lib/handlers/execute/execute"
import { executeOutputValidation } from "#lib/handlers/execute/validation"
import {
    getPending,
    getPendingDescription,
    getPendingOutputValidation,
    getPendingParamValidation,
} from "#lib/handlers/getPending"
import {
    getState,
    getStateDescription,
    getStateOutputValidation,
    getStateParamValidation,
} from "#lib/handlers/getState"
import { simulate, simulateBodyValidation, simulateDescription, simulateOutputValidation } from "#lib/handlers/simulate"
import { submit, submitBodyValidation, submitDescription, submitOutputValidation } from "#lib/handlers/submit"
import {
    waitForReceipt,
    waitForReceiptDescription,
    waitForReceiptOutputValidation,
    waitForReceiptParamValidation,
    waitForReceiptQueryValidation,
} from "#lib/handlers/waitForReceipt"
import { makeResponse } from "#lib/server/makeResponse"
import { validateOutput } from "#lib/utils/validation/helpers"

export default new Hono()
    .post(
        "/simulate", //
        simulateDescription,
        simulateBodyValidation,
        async (c) => {
            const input = c.req.valid("json")
            const output = await simulate(input)
            const [body, code] = makeResponse(output)
            validateOutput(body, simulateOutputValidation, "simulate response")
            return c.json(body, code)
        },
    )
    .post(
        "/submit", //
        submitDescription,
        submitBodyValidation,
        async (c) => {
            const input = c.req.valid("json")
            const output = await submit(input)
            const [body, code, headers] = makeResponse(output)
            for (const k in headers) c.header(k, headers[k as ResponseHeader])
            validateOutput(body, submitOutputValidation, "submit response")
            return c.json(body, code)
        },
    )
    .post(
        "/execute", //
        executeDescription,
        executeBodyValidation,
        async (c) => {
            const input = c.req.valid("json")
            const output = await execute(input)
            const [body, code, headers] = makeResponse(output)
            for (const k in headers) c.header(k, headers[k as ResponseHeader])
            validateOutput(body, executeOutputValidation, "execute response")
            return c.json(body, code)
        },
    )
    .get(
        "/state/:boopHash", //
        getStateDescription,
        getStateParamValidation,
        async (c) => {
            const input = c.req.valid("param")
            const output = await getState(input)
            const [body, code] = makeResponse(output)
            validateOutput(body, getStateOutputValidation, "getState response")
            return c.json(body, code)
        },
    )
    .get(
        "/receipt/:boopHash", //
        waitForReceiptDescription,
        waitForReceiptParamValidation,
        waitForReceiptQueryValidation,
        async (c) => {
            const param = c.req.valid("param")
            const query = c.req.valid("query")
            const output = await waitForReceipt({ ...param, ...query })
            const [body, code] = makeResponse(output)
            validateOutput(body, waitForReceiptOutputValidation, "waitForReceipt response")
            return c.json(body, code)
        },
    )
    .get(
        "/pending/:account", //
        getPendingDescription,
        getPendingParamValidation,
        async (c) => {
            const input = c.req.valid("param")
            const output = await getPending(input)
            const [body, code] = makeResponse(output)
            validateOutput(body, getPendingOutputValidation, "getPending response")
            return c.json(body, code)
        },
    )
