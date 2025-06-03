import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { SubmitterError } from "#lib/types"
import { Address, Hash, UInt256, openApiContent } from "#lib/utils/validation/ark"
import type * as types from "./types"
import { GetPending } from "./types"

// TODO we may want to have an optional entrypoint here
const getPendingParam = type({
    "+": "reject",
    account: Address,
})

const pendingBoopInfo = type({
    boopHash: Hash,
    nonceTrack: UInt256,
    nonceValue: UInt256,
    submitted: "boolean",
})

const getPendingSuccess = type({
    status: type.unit(GetPending.Success),
    account: Address,
    pending: pendingBoopInfo.array(),
    description: "undefined?",
})

const getPendingError = type({
    status: type.valueOf(SubmitterError),
    description: "string",
    account: "undefined?",
    pending: "undefined?",
})

export const getPendingDescription = describeRoute({
    description: "Retrieve pending (not yet included onchain) boops for account",
    responses: {
        200: {
            description: "Successfully retrieved pending boops",
            content: openApiContent(getPendingSuccess),
        },
        other: {
            description: "Failed to retrieve pending boops",
            content: openApiContent(getPendingError),
        },
    },
})

export const getPendingParamValidation = arktypeValidator("param", getPendingParam)
export const getPendingOutputValidation = type(getPendingSuccess, "|", getPendingError)

type GetPendingInput = typeof getPendingParam.infer
type PendingBoopInfoSchema = typeof pendingBoopInfo.infer
type GetPendingSuccess = typeof getPendingSuccess.infer
type GetPendingError = typeof getPendingError.infer
type GetPendingOutput = typeof getPendingOutputValidation.infer

type _a1 = AssertCompatible<GetPendingInput, types.GetPendingInput>
type _a2 = AssertCompatible<PendingBoopInfoSchema, types.PendingBoopInfo>
type _a3 = AssertCompatible<GetPendingSuccess, types.GetPendingSuccess>
type _a4 = AssertCompatible<GetPendingError, types.GetPendingError>
type _a5 = AssertCompatible<GetPendingOutput, types.GetPendingOutput>
