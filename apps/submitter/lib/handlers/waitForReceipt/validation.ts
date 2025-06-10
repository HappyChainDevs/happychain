import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { Bytes, Hash, openApiParameters, openApiResponseContent } from "#lib/utils/validation/ark"
import { SBoopReceipt } from "#lib/utils/validation/boop"
import { WaitForReceipt } from "./types"
import type * as types from "./types"

const waitForReceiptQuery = type({
    "+": "reject",
    // Can't use .optional() here because it doesn't return a `Type` so can't be before the pipe,
    // and putting it after the pipe causes it to get stipped on `waitForReceiptQuery.in`.
    "timeout?": type("0 <= number <= 30000 | /^[0-9]+$/")
        .pipe(Number, type("0 <= number <= 30000"))
        .configure({ example: 500 }),
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
})

const waitForReceiptError = type({
    status: type.valueOf(WaitForReceipt).exclude(type.unit(WaitForReceipt.Success)),
    revertData: Bytes.optional(),
    error: type.string.configure({ example: "Failed to retrieve boop receipt" }),
})

export const waitForReceiptDescription = describeRoute({
    description: "Retrieves the receipt for the specified boop hash, waiting if necessary",
    parameters: openApiParameters({ path: waitForReceiptParam.in, query: waitForReceiptQuery.in }),
    responses: {
        200: {
            description: "Successfully retrieved the boop receipt",
            content: openApiResponseContent(waitForReceiptSuccess),
        },
        other: {
            description: "Failed to retrieve the boop receipt",
            content: openApiResponseContent(waitForReceiptError),
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
type _a2 = AssertCompatible<WaitForReceiptSuccess, types.WaitForReceiptSuccess>
type _a3 = AssertCompatible<WaitForReceiptError, types.WaitForReceiptError>
type _a4 = AssertCompatible<WaitForReceiptOutput, types.WaitForReceiptOutput>
