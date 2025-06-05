import type { AssertCompatible, BigIntSerialized } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { AddressIn, Bytes, openApiContent, openApiContentBody } from "#lib/utils/validation/ark"
import { SBoopIn, SBoopReceipt } from "#lib/utils/validation/boop"
import { Execute } from "./types"
import type * as types from "./types"

const executeInput = type({
    "+": "reject",
    entryPoint: AddressIn.optional(),
    boop: SBoopIn,
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
    description: type.string.configure({ example: "Invalid boop" }),
})

export const executeDescription = describeRoute({
    description: "Execute the supplied boop",
    requestBody: {
        required: true,
        description: "Boop data to execute",
        content: openApiContentBody(executeInput.in),
    },
    responses: {
        200: {
            description: "Boop successfully executed 👉🐈",
            content: openApiContent(executeSuccess),
        },
        other: {
            description: "Boop execution failed 😾",
            content: openApiContent(executeError),
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
type _a2 = AssertCompatible<ExecuteSuccess, BigIntSerialized<types.ExecuteSuccess>>
type _a3 = AssertCompatible<ExecuteError, types.ExecuteError>
type _a4 = AssertCompatible<ExecuteOutput, BigIntSerialized<types.ExecuteOutput>>
