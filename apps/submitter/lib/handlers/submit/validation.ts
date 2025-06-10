import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { Address, Bytes, Hash, openApiBodyContent, openApiResponseContent } from "#lib/utils/validation/ark"
import { SBoop } from "#lib/utils/validation/boop"
import type * as types from "./types"
import { Submit } from "./types"

const submitInput = type({
    "+": "reject",
    entryPoint: Address.optional(),
    boop: SBoop,
})

const submitSuccess = type({
    status: type.unit(Submit.Success),
    boopHash: Hash,
    entryPoint: Address,
})

const submitError = type({
    status: type.valueOf(Submit).exclude(type.unit(Submit.Success)),
    stage: type.enumerated("simulate", "submit"),
    revertData: Bytes.optional(),
    // cf. simulateError.error
    error: type.string.configure({ example: "The call made by the account's `execute` function reverted." }),
})

export const submitDescription = describeRoute({
    description: "Submits the supplied boop to the chain",
    requestBody: {
        required: true,
        description: "Boop to submit and optional EntryPoint contract to submit it to",
        content: openApiBodyContent(submitInput.in),
    },
    responses: {
        200: {
            description: "Boop successfully submitted to the chain",
            content: openApiResponseContent(submitSuccess),
        },
        other: {
            description: "Boop submission failed",
            content: openApiResponseContent(submitError),
        },
    },
})

export const submitBodyValidation = arktypeValidator("json", submitInput)
export const submitOutputValidation = type(submitSuccess, "|", submitError)

type SubmitInput = typeof submitInput.infer
type SubmitSuccess = typeof submitSuccess.infer
type SubmitError = typeof submitError.infer
type SubmitOutput = typeof submitOutputValidation.infer

type _a1 = AssertCompatible<SubmitInput, types.SubmitInput>
type _a2 = AssertCompatible<SubmitSuccess, types.SubmitSuccess>
type _a3 = AssertCompatible<SubmitError, types.SubmitError>
type _a4 = AssertCompatible<SubmitOutput, types.SubmitOutput>
