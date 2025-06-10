import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import type * as types from "#lib/handlers/getState/types"
import { simulateOutputValidation } from "#lib/handlers/simulate/validation"
import { Hash, openApiParameters, openApiResponseContent } from "#lib/utils/validation/ark"
import { SBoopReceipt } from "#lib/utils/validation/boop"
import { GetState } from "./types"

const getStateParam = type({
    "+": "reject",
    boopHash: Hash,
})

const getStateReceipt = type({
    status: type.unit(GetState.Receipt),
    receipt: SBoopReceipt,
})

const getStateSimulated = type({
    status: type.unit(GetState.Simulated),
    simulation: simulateOutputValidation,
})

const getStateSuccess = type(getStateReceipt, "|", getStateSimulated)
const getStateSuccessStatus = type.enumerated(GetState.Receipt, GetState.Simulated)

const getStateError = type({
    status: type.valueOf(GetState).exclude(getStateSuccessStatus),
    error: type.string.configure({ example: "Failed to retrieve boop state" }),
})

export const getStateDescription = describeRoute({
    description: "Retrieve the boop state (simulation results or receipt)",
    parameters: openApiParameters({ path: getStateParam.in }),
    responses: {
        200: {
            description: "Successfully retrieved the boop state",
            content: openApiResponseContent(getStateSuccess),
        },
        other: {
            description: "Failed to retrieve the boop state",
            content: openApiResponseContent(getStateError),
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
