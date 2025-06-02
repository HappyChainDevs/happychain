import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { SubmitterError } from "#lib/types"
import { Address, AddressIn, Hash, UInt256, openApiContent } from "#lib/utils/validation/ark"
import type { SerializedObject } from "#lib/utils/validation/helpers"
import type * as types from "./types"
import { GetPending } from "./types"

const getPendingParam = type({
    "+": "reject",
    account: AddressIn,
})

// Define schema for pending boop info with serialized BigInt values
const pendingBoopInfo = type({
    boopHash: Hash,
    entryPoint: Address,
    // These are serialized BigInt values (strings) in the validation schema
    nonceTrack: UInt256,
    nonceValue: UInt256,
    submitted: type.boolean,
})

const getPendingSuccess = type({
    status: type.unit(GetPending.Success),
    account: Address,
    pending: pendingBoopInfo.array(),
    "description?": type.never,
})

const getPendingError = type({
    status: type.valueOf(SubmitterError).configure({ example: SubmitterError.RpcError }),
    description: type.string,
    "account?": type.never,
    "pending?": type.never,
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

// Using SerializedObject imported from helpers.ts

type _a1 = AssertCompatible<GetPendingInput, types.GetPendingInput>
// Use SerializedObject to make the comparison work with string values instead of bigint
type _a2 = AssertCompatible<PendingBoopInfoSchema, SerializedObject<types.PendingBoopInfo>>
type _a3 = AssertCompatible<GetPendingSuccess, SerializedObject<types.GetPendingSuccess>>
type _a4 = AssertCompatible<GetPendingError, types.GetPendingError>
type _a5 = AssertCompatible<GetPendingOutput, SerializedObject<types.GetPendingOutput>>
