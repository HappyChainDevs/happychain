import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { padHex } from "viem"
import { Address, Bytes32, openApiBodyContent, openApiResponseContent } from "#lib/utils/validation/ark"
import { CreateAccount } from "./types"
import type * as types from "./types"

export const createAccountInput = type({
    "+": "reject",
    owner: Address,
    salt: Bytes32.configure({ example: "0x42" }).default(padHex("0x1", { size: 32 })),
})

const successStatus = type.enumerated(CreateAccount.Success, CreateAccount.AlreadyCreated)

const createAccountSuccess = type({
    owner: Address,
    salt: Bytes32.configure({ example: "0x42" }),
    status: successStatus,
    address: Address.configure({ example: "0x48dbB3eCe3786747F49998b2fA83390563660771" }), // use different address
})

const createAccountCreated = type(createAccountSuccess, "&", type({ status: type.unit(CreateAccount.Success) }))
const createAccountExisting = type(createAccountSuccess, "&", type({ status: type.unit(CreateAccount.AlreadyCreated) }))

const createAccountError = type({
    owner: Address,
    salt: Bytes32.configure({ example: "0x42" }),
    status: type.valueOf(CreateAccount).exclude(successStatus),
    error: type.string.configure({ example: "Account creation failed onchain" }),
})

export const createAccountDescription = describeRoute({
    description: "Creates a new account or returns an existing account address for the given owner",
    requestBody: {
        required: true,
        description: "Owner address and salt to create or retrieve an account",
        content: openApiBodyContent(createAccountInput.in),
    },
    responses: {
        200: {
            description: "Account address successfully retrieved for existing account",
            content: openApiResponseContent(createAccountExisting),
        },
        201: {
            description: "Successfully created the account",
            content: openApiResponseContent(createAccountCreated),
        },
        other: {
            description: "Account creation failed",
            content: openApiResponseContent(createAccountError),
        },
    },
})

export const createAccountBodyValidation = arktypeValidator("json", createAccountInput)
export const createAccountOutputValidation = type(createAccountSuccess, "|", createAccountError)

type CreateAccountInput = typeof createAccountInput.in.infer
type CreateAccountSuccess = typeof createAccountSuccess.infer
type CreateAccountError = typeof createAccountError.infer
type CreateAccountOutput = typeof createAccountOutputValidation.infer

type _a1 = AssertCompatible<CreateAccountInput, types.CreateAccountInput>
type _a2 = AssertCompatible<CreateAccountSuccess, types.CreateAccountSuccess>
type _a3 = AssertCompatible<CreateAccountError, types.CreateAccountError>
type _a4 = AssertCompatible<CreateAccountOutput, types.CreateAccountOutput>
