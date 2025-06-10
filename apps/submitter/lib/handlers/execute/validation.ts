import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { Address, Bytes, openApiBodyContent, openApiResponseContent } from "#lib/utils/validation/ark"
import { SBoop, SBoopReceipt } from "#lib/utils/validation/boop"
import { Execute } from "./types"
import type * as types from "./types"

const executeInput = type({
    "+": "reject",
    entryPoint: Address.optional(),
    boop: SBoop,
    timeout: type.number.configure({ example: 10_000 }).optional(),
})

const executeSuccess = type({
    status: type.unit(Execute.Success),
    receipt: SBoopReceipt,
})

const executeError = type({
    status: type.valueOf(Execute).exclude(type.unit(Execute.Success)),
    stage: type.enumerated("simulate", "submit", "execute"),
    revertData: Bytes.optional(),
    // cf. simulateError.error
    error: type.string.configure({ example: "The call made by the account's `execute` function reverted." }),
})

export const executeDescription = describeRoute({
    description: "Submit the boop to the chain, then waits for and return its receipt if successful",
    requestBody: {
        required: true,
        description: "Boop to submit and optional EntryPoint contract to submit it to",
        content: openApiBodyContent(executeInput.in),
    },
    responses: {
        200: {
            description: "Boop successfully executed 👉🐈",
            content: openApiResponseContent(executeSuccess),
        },
        other: {
            description: "Boop execution failed 😾",
            content: openApiResponseContent(executeError),
        },
    },
})

export const executeBodyValidation = arktypeValidator("json", executeInput)
export const executeOutputValidation = type(executeSuccess, "|", executeError)

type ExecuteInput = typeof executeInput.infer
type ExecuteSuccess = typeof executeSuccess.infer
type ExecuteError = typeof executeError.infer
type ExecuteOutput = typeof executeOutputValidation.infer

type _a1 = AssertCompatible<ExecuteInput, types.ExecuteInput>
type _a2 = AssertCompatible<ExecuteSuccess, types.ExecuteSuccess>
type _a3 = AssertCompatible<ExecuteError, types.ExecuteError>
type _a4 = AssertCompatible<ExecuteOutput, types.ExecuteOutput>
