import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { Bytes, Hash, openApiContent } from "#lib/utils/validation/ark"
import { SBoopReceipt } from "#lib/utils/validation/boop"
import { WaitForReceipt } from "./types"
import type * as types from "./types"

const waitForReceiptQuery = type({
    "+": "reject",
    timeout: type("number.integer | string.integer.parse") //
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
    "revertData?": "never",
    "description?": "never",
})

const waitForReceiptError = type({
    status: type
        .valueOf(WaitForReceipt)
        .exclude(type.unit(WaitForReceipt.Success))
        .configure({ example: WaitForReceipt.UnknownBoop }),
    revertData: Bytes.optional(),
    description: "string",
    "receipt?": "never",
})

export const waitForReceiptDescription = describeRoute({
    description: "Retrieve the receipt for the supplied boop hash, waiting if necessary",
    responses: {
        200: {
            description: "Successfully retrieed the receipt",
            content: openApiContent(waitForReceiptSuccess),
        },
        other: {
            description: "Failed to retrieve the receipt",
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
type _a2 = AssertCompatible<WaitForReceiptSuccess, types.WaitForReceiptSuccess>
type _a3 = AssertCompatible<WaitForReceiptError, types.WaitForReceiptError>
type _a4 = AssertCompatible<WaitForReceiptOutput, types.WaitForReceiptOutput>
