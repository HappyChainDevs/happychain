import type { Address, Hex, Prettify } from "@happy.tech/common"
import { SubmitterError } from "#lib/types"

// =====================================================================================================================
// INPUT

/** Input of a `createAccount` call (`accounts/create` route). */
export type CreateAccountInput = {
    /** User EOA address */
    owner: Address
    /** Salt for the account creation — no greater than 32 bytes. */
    salt: Hex
}

// =====================================================================================================================
// OUTPUT

/** Possible output status of a `createAccount` call (`accounts/create` route). */
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

/**
 * Output of a `createAccount` call (`account/create` route): either an
 * account successfully created (or previously created) {@link CreateAccountSuccess},
 * or an error {@link CreateAccountError}.
 */
export type CreateAccountOutput = CreateAccountSuccess | CreateAccountError

// =====================================================================================================================
// OUTPUT (SUCCESS)

/** Successful account creation (or creation previously successful). */
export type CreateAccountSuccess = Prettify<
    CreateAccountInput & {
        status: typeof CreateAccount.Success | typeof CreateAccount.AlreadyCreated
        /** The address of the account. */
        address: Address
        description?: undefined
    }
>

// =====================================================================================================================
// OUTPUT (ERROR)

/** Failed account creation. */
export type CreateAccountError = Prettify<
    CreateAccountInput & {
        status: Exclude<CreateAccountStatus, typeof CreateAccount.Success | typeof CreateAccount.AlreadyCreated>
        /** Description of the problem. */
        description: string
        address?: undefined
    }
>

// =====================================================================================================================
