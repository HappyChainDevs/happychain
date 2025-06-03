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
    entryPoint: Address.optional(),
    boop: SBoop,
    timeout: "number?",
})

const executeSuccess = type({
    status: type.unit(Execute.Success),
    receipt: SBoopReceipt,
    stage: "undefined?",
    revertData: "undefined?",
    description: "undefined?",
})

const executeError = type({
    status: type
        .valueOf(Execute)
        .exclude(type.unit(Execute.Success))
        .configure({ example: Onchain.ValidationRejected }),
    stage: type.enumerated("simulate", "submit", "execute"),
    revertData: Bytes.optional(),
    description: "string",
    receipt: "undefined?",
})

export const executeDescription = describeRoute({
    description: "Execute the supplied boop",
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
