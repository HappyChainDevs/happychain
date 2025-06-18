import { type BigIntSerialized, serializeBigInt } from "@happy.tech/common"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { CreateAccount, type CreateAccountStatus } from "#lib/handlers/createAccount"
import type { ExecuteStatus } from "#lib/handlers/execute"
import { GetPending, type GetPendingStatus } from "#lib/handlers/getPending"
import { GetState, type GetStateStatus } from "#lib/handlers/getState"
import type { SimulateStatus } from "#lib/handlers/simulate"
import type { SubmitStatus } from "#lib/handlers/submit"
import type { WaitForReceiptStatus } from "#lib/handlers/waitForReceipt"
import { Onchain, SubmitterError } from "#lib/types"

type Status =
    | SimulateStatus
    | SubmitStatus
    | ExecuteStatus
    | CreateAccountStatus
    | GetStateStatus
    | WaitForReceiptStatus
    | GetPendingStatus

export function makeResponse<T extends { status: Status }>(output: T): [BigIntSerialized<T>, ContentfulStatusCode] {
    const response = serializeBigInt(output)
    switch (output.status) {
        case Onchain.Success:
        case CreateAccount.AlreadyCreated:
        case GetState.Receipt:
        case GetState.Simulated:
        case GetPending.Success:
            return [response, 200] // OK
        case CreateAccount.Success:
            return [response, 201] // Created
        case Onchain.InvalidNonce:
        case Onchain.InvalidExtensionValue:
        case Onchain.ExecuteRejected:
        case SubmitterError.InvalidValues:
        case SubmitterError.SubmitterFeeTooLow:
            return [response, 400] // Bad Request
        case Onchain.InsufficientStake:
        case Onchain.PayoutFailed:
            return [response, 402] // Payment Required
        case Onchain.InvalidSignature:
        case Onchain.ValidationRejected:
        case Onchain.PaymentValidationRejected:
            return [response, 403] // Forbidden
        case GetState.UnknownBoop:
        case GetState.UnknownState:
            return [response, 404] // Not Found
        case SubmitterError.SubmitTimeout:
        case SubmitterError.ReceiptTimeout:
            return [response, 408] // Request Timeout
        case CreateAccount.Failed:
        case Onchain.MissingValidationInformation:
        case Onchain.MissingGasValues:
        case Onchain.ValidationReverted:
        case Onchain.PaymentValidationReverted:
        case Onchain.ExtensionNotRegistered:
        case Onchain.ExtensionAlreadyRegistered:
        case Onchain.ExecuteReverted:
        case Onchain.CallReverted:
        case Onchain.UnexpectedReverted:
        case Onchain.EntryPointOutOfGas:
        case Onchain.GasPriceTooLow:
        case SubmitterError.GasPriceTooHigh:
        case SubmitterError.NonceTooFarAhead:
        case SubmitterError.BoopReplaced:
        case SubmitterError.ExternalSubmit:
        case SubmitterError.AlreadyProcessing:
            // signifying a correctly-formatted request, unable to process
            return [response, 422] // Unprocessable Content
        case SubmitterError.BufferExceeded:
            return [response, 429] // Too Many Requests
        case SubmitterError.RpcError:
        case SubmitterError.UnexpectedError:
        case SubmitterError.TransactionManagementError:
            return [response, 500] // Internal Server Error
        case SubmitterError.OverCapacity:
            // TODO set Retry-After HTTP header
            return [response, 503] // Service Unavailable
        case SubmitterError.ClientError:
            throw new Error("BUG: makeResponse") // only thrown client-side
        default: {
            const _: never = output.status // exhaustiveness check
            return [response, 500]
        }
    }
}
