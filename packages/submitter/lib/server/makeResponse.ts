import { type BigIntSerialized, serializeBigInt } from "@happy.tech/common"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { Result } from "neverthrow"
import { HappyBaseError } from "#lib/errors"
import { CreateAccount } from "#lib/handlers/createAccount"
import { Onchain, SubmitterError } from "#lib/types"

export function makeResponseOld<TOk>(
    output: Result<TOk, unknown>,
): [BigIntSerialized<TOk> | BigIntSerialized<unknown>, ContentfulStatusCode] {
    if (output.isOk()) return [serializeBigInt(output.value), 200] as const

    const error =
        output.error instanceof HappyBaseError //
            ? output.error.getResponseData()
            : output.error // unknown error

    return [serializeBigInt(error), 422] as const
}

export function makeResponse<T extends { status: string }>(output: T): [BigIntSerialized<T>, ContentfulStatusCode] {
    const response = serializeBigInt(output)
    switch (output.status) {
        case Onchain.Success:
        case CreateAccount.AlreadyCreated:
            return [response, 200] // OK
        case CreateAccount.Success:
            return [response, 201] // Created
        case Onchain.InvalidNonce:
        case Onchain.InvalidExtensionValue:
        case Onchain.ExecuteRejected:
            return [response, 400] // Bad Request
        case Onchain.MissingValidationInformation:
        case CreateAccount.Failed:
        case Onchain.ValidationReverted:
        case Onchain.PaymentValidationReverted:
        case Onchain.ExecuteReverted:
        case Onchain.CallReverted:
        case Onchain.GasPriceTooHigh:
        case Onchain.UnexpectedReverted:
        case SubmitterError.RpcError:
            // signifying a correctly-formatted request, unable to process
            return [response, 422] // Unprocessable Content
        case Onchain.InsufficientStake:
        case Onchain.PayoutFailed:
            return [response, 402] // Payment Required
        // TODO is this actually a useful thing to distinguish from ValidationRejected?
        case Onchain.InvalidSignature:
        case Onchain.ValidationRejected:
        case Onchain.PaymentValidationRejected:
            return [response, 403] // Forbidden
        case SubmitterError.BufferExceeded:
            return [response, 429] // Too Many Requests
        case SubmitterError.OverCapacity:
            // TODO set Retry-After HTTP header
            return [response, 503] // Service Unavailable
        case SubmitterError.UnexpectedError:
            return [response, 500] // Internal Server Error
        case SubmitterError.SimulationTimeout:
        case SubmitterError.SubmitTimeout:
        case SubmitterError.ReceiptTimeout:
            return [response, 408] // Request Timeout
    }

    return [serializeBigInt(output), 200]

    // TODO 404 (Not Found) for boop not found
}
