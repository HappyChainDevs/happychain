import type { Address } from "@happy.tech/common"
import { SubmitterError } from "#lib/types"

/**
 * Possible results of an `account/create` call.
 */
export const CreateAccount = {
    ...SubmitterError,
    /** The account was successfully created. */
    Success: "createAccountSuccess",
    /** The account was already existing. */
    AlreadyCreated: "createAccountAlreadyCreated",
    /** The account creation transaction made it onchain, but failed there. */
    Failed: "createAccountFailed",
} as const

/**
 * @inheritDoc CreateAccount
 * cf. {@link CreateAccount}
 */
export type CreateAccountStatus = (typeof CreateAccount)[keyof typeof CreateAccount]

export type CreateAccountInput = {
    owner: Address
    salt: Address
}

/**
 * Output of an `account/create` call: either an account successfully created (or previously created), or a failure.
 */
export type CreateAccountOutput = CreateAccountSuccess | CreateAccountFailed

/** Successful account creation (or creation previously successful). */
export type CreateAccountSuccess = CreateAccountInput & {
    status: typeof CreateAccount.Success | typeof CreateAccount.AlreadyCreated

    /** The address of the account. */
    address: Address
}

/** Failed account creation. */
export type CreateAccountFailed = CreateAccountInput & {
    status: Exclude<CreateAccountStatus, typeof CreateAccount.Success | typeof CreateAccount.AlreadyCreated>

    /** Optional description of the problem. */
    description?: string
}
