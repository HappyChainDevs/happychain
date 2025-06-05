import type { AssertCompatible, BigIntSerialized } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { Bytes, Hash, openApiContent } from "#lib/utils/validation/ark"
import { SBoopReceipt } from "#lib/utils/validation/boop"
import { WaitForReceipt } from "./types"
import type * as types from "./types"

const waitForReceiptQuery = type({
    "+": "reject",
    timeout: type("number.integer | string.integer.parse")
        .pipe(type("0 <= number <= 30000"))
        .configure({ example: 500 })
        .optional(),
})

const waitForReceiptParam = type({
    "+": "reject",
    boopHash: Hash,
})

const waitForReceiptInput = type(
    waitForReceiptQuery.onUndeclaredKey("ignore"),
    "&",
    waitForReceiptParam.onUndeclaredKey("ignore"),
)

const waitForReceiptSuccess = type({
    status: type.unit(WaitForReceipt.Success),
    receipt: SBoopReceipt,
    revertData: type.never.optional(),
    description: type.never.optional(),
})

const waitForReceiptError = type({
    status: type.valueOf(WaitForReceipt).exclude(type.unit(WaitForReceipt.Success)),
    revertData: Bytes.optional(),
    description: type.string.configure({ example: "Failed to retrieve boop receipt" }),
    receipt: type.never.optional(),
})

export const waitForReceiptDescription = describeRoute({
    description: "Retrieve the boop receipt for the specified boop hash, waiting if necessary",
    responses: {
        200: {
            description: "Successfully retrieved the boop receipt",
            content: openApiContent(waitForReceiptSuccess),
        },
        other: {
            description: "Failed to retrieve the boop receipt",
            content: openApiContent(waitForReceiptError),
        },
    },
})

export const waitForReceiptQueryValidation = arktypeValidator("query", waitForReceiptQuery)
export const waitForReceiptParamValidation = arktypeValidator("param", waitForReceiptParam)
export const waitForReceiptOutputValidation = type(waitForReceiptSuccess, "|", waitForReceiptError)

type WaitForReceiptInput = typeof waitForReceiptInput.infer
type WaitForReceiptSuccess = typeof waitForReceiptSuccess.infer
type WaitForReceiptError = typeof waitForReceiptError.infer
type WaitForReceiptOutput = typeof waitForReceiptOutputValidation.infer

type _a1 = AssertCompatible<WaitForReceiptInput, types.WaitForReceiptInput>
type _a2 = AssertCompatible<WaitForReceiptSuccess, BigIntSerialized<types.WaitForReceiptSuccess>>
type _a3 = AssertCompatible<WaitForReceiptError, types.WaitForReceiptError>
type _a4 = AssertCompatible<WaitForReceiptOutput, BigIntSerialized<types.WaitForReceiptOutput>>
