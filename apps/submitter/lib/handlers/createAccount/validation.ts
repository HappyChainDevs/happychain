import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { Address, Bytes32, openApiContent } from "#lib/utils/validation/ark"
import { CreateAccount } from "./types"
import type * as types from "./types"

export const createAccountInput = type({
    "+": "reject",
    owner: Address.configure({ example: "0x1234567890123456789012345678901234567890" }),
    salt: Bytes32.configure({ example: "0x1234567890123456789012345678901234567890" }),
})

const successStatus = type.enumerated(CreateAccount.Success, CreateAccount.AlreadyCreated)

const createAccountSuccess = type({
    owner: Address,
    salt: Bytes32,
    status: successStatus.configure({ example: CreateAccount.Success }),
    address: Address.configure({ example: "0x1234567890123456789012345678901234567890" }),
    "description?": "never",
})

const createAccountError = type({
    owner: Address,
    salt: Bytes32,
    status: type.valueOf(CreateAccount).exclude(successStatus).configure({ example: CreateAccount.Failed }),
    description: "string",
    "address?": "never",
})

export const createAccountDescription = describeRoute({
    validateResponse: false,
    description: "Creates an account",
    requestBody: {
        required: true,
        description: "Account data to create",
        content: {
            "application/json": {
                schema: {},
            },
        },
    },
    responses: {
        200: {
            description: "The account already existed",
            content: openApiContent(createAccountSuccess),
        },
        201: {
            description: "Successfully created the account",
            content: openApiContent(createAccountSuccess),
        },
        other: {
            description: "Could not create the account",
            content: openApiContent(createAccountError),
        },
    },
})

export const createAccountBodyValidation = arktypeValidator("json", createAccountInput)
export const createAccountOutputValidation = type(createAccountSuccess, "|", createAccountError)

type CreateAccountInput = typeof createAccountInput.infer
type CreateAccountSuccess = typeof createAccountSuccess.infer
type CreateAccountError = typeof createAccountError.infer
type CreateAccountOutput = typeof createAccountOutputValidation.infer

type _a1 = AssertCompatible<CreateAccountInput, types.CreateAccountInput>
type _a2 = AssertCompatible<CreateAccountSuccess, types.CreateAccountSuccess>
type _a3 = AssertCompatible<CreateAccountError, types.CreateAccountError>
type _a4 = AssertCompatible<CreateAccountOutput, types.CreateAccountOutput>
