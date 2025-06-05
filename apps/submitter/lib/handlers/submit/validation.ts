import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { Address, AddressIn, Bytes, Hash, openApiContent, openApiContentBody } from "#lib/utils/validation/ark"
import { SBoopIn } from "#lib/utils/validation/boop"
import type * as types from "./types"
import { Submit } from "./types"

const submitInput = type({
    "+": "reject",
    entryPoint: AddressIn.optional(),
    boop: SBoopIn,
})

const submitSuccess = type({
    status: type.unit(Submit.Success),
    boopHash: Hash.configure({ example: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" }),
    entryPoint: Address.configure({ example: "0x1234567890123456789012345678901234567890" }),
})

const submitError = type({
    status: type.valueOf(Submit).exclude(type.unit(Submit.Success)),
    stage: type.enumerated("simulate", "submit"),
    revertData: Bytes.configure({
        example: "0x1234567890123456789012345678901234567890123456789012345678901234",
    }).optional(),
    description: type("string").configure({ example: "Invalid boop" }),
})

export const submitDescription = describeRoute({
    description: "Submits the supplied boop to the chain",
    requestBody: {
        required: true,
        description: "Boop data to submit to the chain",
        content: openApiContentBody(submitInput.in),
    },
    responses: {
        200: {
            description: "Boop successfully submitted to the chain",
            content: openApiContent(submitSuccess),
        },
        other: {
            description: "Boop submission failed",
            content: openApiContent(submitError),
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
