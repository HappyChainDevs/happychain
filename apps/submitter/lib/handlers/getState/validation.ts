import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import type * as types from "#lib/handlers/getState/types"
import { simulateOutputValidation } from "#lib/handlers/simulate/validation"
import { HashIn, openApiContent } from "#lib/utils/validation/ark"
import { SBoopReceipt } from "#lib/utils/validation/boop"
import type { SerializedObject } from "#lib/utils/validation/helpers.ts"
import { GetState } from "./types"

const getStateParam = type({
    "+": "reject",
    boopHash: HashIn,
})

const getStateReceipt = type({
    status: type.unit(GetState.Receipt),
    receipt: SBoopReceipt, // Use SBoopReceiptIn for input validation to transform strings to bigint
    "simulation?": type.never,
    "description?": type.never,
})

const getStateSimulated = type({
    status: type.unit(GetState.Simulated),
    simulation: simulateOutputValidation,
    "receipt?": type.never,
    "description?": type.never,
})

const getStateSuccess = type(getStateReceipt, "|", getStateSimulated)

const getStateError = type({
    status: type
        .valueOf(GetState)
        .exclude(type.enumerated(GetState.Receipt, GetState.Simulated))
        .configure({ example: GetState.ClientError }),
    description: type.string,
    "receipt?": type.never,
    "simulation?": type.never,
})

export const getStateDescription = describeRoute({
    description: "Retrieve boop state (simulation results or receipt)",
    responses: {
        200: {
            description: "Successfully retrieved boop state",
            content: openApiContent(getStateSuccess),
        },
        other: {
            description: "Failed to retrieve boop state",
            content: openApiContent(getStateError),
        },
    },
})

export const getStateParamValidation = arktypeValidator("param", getStateParam)
export const getStateOutputValidation = type(getStateSuccess, "|", getStateError)

type GetStateInput = typeof getStateParam.infer
type GetStateReceipt = typeof getStateReceipt.infer
type GetStateSimulated = typeof getStateSimulated.infer
type GetStateError = typeof getStateError.infer
type GetStateOutput = typeof getStateOutputValidation.infer

// Input validation should match the actual TypeScript interfaces (without SerializedObject)
type _a1 = AssertCompatible<GetStateInput, types.GetStateInput>

// Output validation schemas use regular types that expect serialized BigInt strings
// Type assertions need SerializedObject to bridge the gap between string in schema and bigint in interface
type _a2 = AssertCompatible<GetStateReceipt, SerializedObject<types.GetStateReceipt>>
type _a3 = AssertCompatible<GetStateSimulated, SerializedObject<types.GetStateSimulated>>
type _a4 = AssertCompatible<GetStateError, types.GetStateError> // No BigInt fields, so no SerializedObject needed
type _a5 = AssertCompatible<GetStateOutput, SerializedObject<types.GetStateOutput>>
