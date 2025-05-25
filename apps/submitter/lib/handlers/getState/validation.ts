import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import type * as types from "#lib/handlers/getState/types"
import { simulateOutputValidation } from "#lib/handlers/simulate/validation"
import { Hash, openApiContent } from "#lib/utils/validation/ark"
import { SBoopReceipt } from "#lib/utils/validation/boop"
import { GetState } from "./types"

// TODO the type has an entrypoint, but we never pass one
const getStateParam = type({
    boopHash: Hash,
})

const getStateReceipt = type({
    status: type.unit(GetState.Receipt),
    receipt: SBoopReceipt,
    simulation: "undefined?",
    description: "undefined?",
})

const getStateSimulated = type({
    status: type.unit(GetState.Simulated),
    simulation: simulateOutputValidation,
    receipt: "undefined?",
    description: "undefined?",
})

const getStateSuccess = type(getStateReceipt, "|", getStateSimulated)

const getStateError = type({
    status: type.valueOf(GetState).exclude(type.enumerated(GetState.Receipt, GetState.Simulated)),
    description: "string",
    receipt: "undefined?",
    simulation: "undefined?",
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

type _a1 = AssertCompatible<GetStateInput, types.GetStateInput>
type _a2 = AssertCompatible<GetStateReceipt, types.GetStateReceipt>
type _a3 = AssertCompatible<GetStateSimulated, types.GetStateSimulated>
type _a4 = AssertCompatible<GetStateError, types.GetStateError>
type _a5 = AssertCompatible<GetStateOutput, types.GetStateOutput>
