import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { Onchain } from "#lib/types"
import { Address, Bytes, openApiContent } from "#lib/utils/validation/ark"
import { SBoop, SBoopReceipt } from "#lib/utils/validation/boop"
import { Execute } from "./types"
import type * as types from "./types"

const executeInput = type({
    "+": "reject",
    entryPoint: Address.configure({ example: "0x1234567890123456789012345678901234567890" }).optional(),
    boop: SBoop,
    "timeout?": type("number").configure({ example: 10_000 }),
})

// Success validator with transformations (for actual validation)
const executeSuccess = type({
    status: type.unit(Execute.Success).configure({ example: Execute.Success }),
    receipt: SBoopReceipt,
    "stage?": "never",
    "revertData?": "never",
    "description?": "never",
})

const executeError = type({
    status: type
        .valueOf(Execute)
        .exclude(type.unit(Execute.Success))
        .configure({ example: Onchain.ValidationRejected }),
    stage: type.enumerated("simulate", "submit", "execute").configure({ example: "simulate" }),
    revertData: Bytes.configure({ example: "0x1234567890123456789012345678901234567890" }).optional(),
    description: type("string").configure({ example: "Invalid boop" }),
    "receipt?": "never",
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

type _a1 = AssertCompatible<ExecuteInput, types.ExecuteInput>
type _a2 = AssertCompatible<ExecuteSuccess, types.ExecuteSuccess>
type _a3 = AssertCompatible<ExecuteError, types.ExecuteError>
type _a4 = AssertCompatible<ExecuteOutput, types.ExecuteOutput>
