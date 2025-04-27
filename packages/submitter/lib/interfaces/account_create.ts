import type { Address } from "@happy.tech/common"
import type { SubmitterErrorStatus } from "#lib/interfaces/status"

export interface CreateAccountInput {
    owner: Address
    salt: Address
}

export enum CreateAccountOwnStatus {
    /** The account was successfully created. */
    Success = "createAccountSuccess",
    /** The account was already existing. */
    AlreadyCreated = "createAccountAlreadyCreated",
    /** The account creation transaction made it onchain, but failed there. */
    Failed = "createAccountFailed",
}

export type CreateAccountStatus = CreateAccountOwnStatus | SubmitterErrorStatus
export type CreateAccountStatusSuccess = CreateAccountOwnStatus.Success | CreateAccountOwnStatus.AlreadyCreated
export type CreateAccountStatusFailed = Exclude<CreateAccountStatus, CreateAccountStatusSuccess>

export type CreateAccountOutput = CreateAccountInput &
    (
        | {
              status: CreateAccountStatusSuccess

              /** The address of the account. */
              address: Address
          }
        | {
              status: CreateAccountStatusFailed

              /** Optional description of the problem. */
              description?: string
          }
    )
