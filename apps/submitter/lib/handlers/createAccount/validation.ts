import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { Address, Bytes32, openApiContent } from "#lib/utils/validation/ark"
import { CreateAccount } from "./types"
import type * as types from "./types"

export const createAccountInput = type({
    "+": "reject",
    owner: Address,
    salt: Bytes32,
})

const successStatus = type.enumerated(CreateAccount.Success, CreateAccount.AlreadyCreated)

const createAccountSuccess = type({
    owner: Address,
    salt: Bytes32,
    status: successStatus,
    address: Address,
    description: "undefined?",
})

const createAccountError = type({
    owner: Address,
    salt: Bytes32,
    status: type.valueOf(CreateAccount).exclude(successStatus),
    description: "string",
    address: "undefined?",
})

export const createAccountDescription = describeRoute({
    description: "Create a new account",
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
            description: "Could not create theaccount",
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
