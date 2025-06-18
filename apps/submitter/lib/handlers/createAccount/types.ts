import type { Address, Hex } from "@happy.tech/common"
import { SubmitterError } from "#lib/types"

// =====================================================================================================================
// INPUT

/** Input of a `createAccount` call (`accounts/create` route). */
export type CreateAccountInput = {
    /** User EOA address */
    owner: Address
    /** Salt for the account creation — no greater than 32 bytes. */
    salt?: Hex
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
    /** Timed out while waiting for the account creation receipt. */
    Timeout: SubmitterError.ReceiptTimeout,
    /** The account creation transaction made it onchain, but failed there. */
    Failed: "createAccountFailed",
    /** @inheritDoc SubmitterError.TransactionManagementError */
    TransactionManagementError: SubmitterError.TransactionManagementError,
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
export type CreateAccountSuccess = {
    status: typeof CreateAccount.Success | typeof CreateAccount.AlreadyCreated
    /** User EOA address */
    owner: Address
    /** Salt for the account creation — no greater than 32 bytes. */
    salt: Hex
    /** The address of the account. */
    address: Address
    error?: undefined
}

// =====================================================================================================================
// OUTPUT (ERROR)

/** Failed account creation. */
export type CreateAccountError = {
    status: Exclude<CreateAccountStatus, typeof CreateAccount.Success | typeof CreateAccount.AlreadyCreated>
    /** User EOA address */
    owner: Address
    /** Salt for the account creation — no greater than 32 bytes. */
    salt: Hex
    /** Description of the problem. */
    error: string
    address?: undefined
}

// =====================================================================================================================
