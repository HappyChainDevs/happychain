import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { Onchain } from "#lib/types"
import { AddressIn, Bytes, openApiContent } from "#lib/utils/validation/ark"
import { SBoopIn, SBoopReceipt } from "#lib/utils/validation/boop"
import type { SerializedObject } from "#lib/utils/validation/helpers"
import { Execute } from "./types"
import type * as types from "./types"

const executeInput = type({
    "+": "reject",
    entryPoint: AddressIn.optional(),
    boop: SBoopIn,
    "timeout?": type.number.configure({ example: 60 }),
})

// Success validator with transformations (for actual validation)
const executeSuccess = type({
    status: type.unit(Execute.Success).configure({ example: Execute.Success }),
    receipt: SBoopReceipt,
    "stage?": type.never,
    "revertData?": type.never,
    "description?": type.never,
})

const executeError = type({
    status: type
        .valueOf(Execute)
        .exclude(type.unit(Execute.Success))
        .configure({ example: Onchain.ValidationRejected }),
    stage: type.enumerated("simulate", "submit", "execute").configure({ example: "simulate" }),
    revertData: Bytes.configure({ example: "0x1234567890123456789012345678901234567890" }).optional(),
    description: type.string.configure({ example: "Invalid boop" }),
    "receipt?": type.never,
})

export const executeDescription = describeRoute({
    description: "Execute the supplied boop",
    requestBody: {
        required: true,
        description: "Account data to create",
        content: {
            "application/json": {
                schema: {},
            },
        },
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

// Input validation should match the actual types
type _a1 = AssertCompatible<ExecuteInput, types.ExecuteInput>
// Output validation needs SerializedObject to handle BigInt serialization
type _a2 = AssertCompatible<ExecuteSuccess, SerializedObject<types.ExecuteSuccess>>
type _a3 = AssertCompatible<ExecuteError, types.ExecuteError>
type _a4 = AssertCompatible<ExecuteOutput, SerializedObject<types.ExecuteOutput>>
