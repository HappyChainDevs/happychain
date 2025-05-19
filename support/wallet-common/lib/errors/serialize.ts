import { getProp, hasDefinedKey, hasKey, stringify } from "@happy.tech/common"
import { HappyRpcError } from "./HappyRpcError"
import { ProviderRpcError, isEIP1193ErrorCode } from "./eip1193Errors"
import { EIP1474ErrorCodes, EthereumRpcError, isEIP1474ErrorCode } from "./eip1474Errors"
import { RevertErrorCode, RevertRpcError } from "./revertError"

/**
 * This is a JSON-serializable encoding of provider RPC errors, suitable to transmit
 * the error between window context or over the network (unlike the {@link Error} class).
 */
export type SerializedRpcError = {
    code: number
    details?: string
    ctxMessages?: string[]
    cause?: string
}

/**
 * Standardizes any error into a RPC error.
 */
export function standardizeRpcError(error: unknown): HappyRpcError {
    if (error instanceof HappyRpcError) return error
    return parseRpcError(serializeRpcError(error))
}

/**
 * Converts an unknown provider RPC error into a returns a JSON-serializable object
 * suitable to transmit the error between window context or over the network.
 *
 * If the error is an object, its relevant fields are `message`, `shortMessage`, `details`, `data`, and `ctxMessage`,
 * which all end up formatted in the serialized error message (excepted `shortMessage` if `message` exists).
 */
export function serializeRpcError(error: unknown, ctxMessages?: string[]): SerializedRpcError {
    if (error instanceof ProviderRpcError || error instanceof EthereumRpcError) {
        return {
            code: error.code,
            details: error.details,
            ctxMessages: [...(error.ctxMessages ?? []), ...(ctxMessages ?? [])],
            cause: stringify(error.cause),
        }
    }
    if (typeof error === "string") {
        return { code: EIP1474ErrorCodes.InternalError, details: error }
    }
    if (typeof error !== "object" || error === null) {
        return { code: EIP1474ErrorCodes.InternalError }
    }

    let msgArray = ctxMessages ?? []
    msgArray = msgArray.concat((getProp(error, "ctxMessages", "array") ?? []).map(stringify))
    const maybeCtxMessages = msgArray.length > 0 ? msgArray : undefined

    const code = getProp(error, "code", "number") ?? EIP1474ErrorCodes.InternalError
    return rpcErrorObjectWithCode(code, error, maybeCtxMessages)
}

/**
 * Returns a serialized rpc error from a non-null object and error code.
 *
 * This crafts the {@link SerializedRpcError.details} in the following manner:
 * - use `error.message` if present
 * - otherwise, use `error.shortMessage` if present
 * - append `error.details` if present
 * - append `error.data` if present
 * - if the details are still empty, use `error.toString()` if it's not an Error type and
 *   returns something else than "[object Object]"
 *
 * Along the way, attempts are made to stringify non-string inputs.
 *
 * This also copies the ctxMessages to the serialized object, if provided.
 */
function rpcErrorObjectWithCode(code: number, error: object, ctxMessages?: string[]): SerializedRpcError {
    const errMessage = hasDefinedKey(error, "message") ? stringify(error.message) : undefined
    const errDetails = hasDefinedKey(error, "details") ? stringify(error.details) : undefined
    const errData = hasDefinedKey(error, "data") ? stringify(error.data) : undefined
    const cause = hasDefinedKey(error, "cause") ? stringify(error.cause) : undefined

    let details = errMessage
    if (!details) {
        details = hasDefinedKey(error, "shortMessage") ? stringify(error.shortMessage) : undefined
    }
    if (errDetails) {
        details = details ? `${details}\n\n${errDetails}` : errDetails
    }
    if (errData) {
        details = details ? `${details}\n\n$Data: {errData}` : `Data: ${errData}`
    }
    if (!details && !(error instanceof Error) && hasKey(error, "toString", "function")) {
        const string = error.toString()
        if (string !== "[object Object]") details = string
    }

    return { code, details, ctxMessages, cause }
}

/**
 * Convert a serialized provider RPC error into a suitable {@link Error} instance.
 */
export function parseRpcError(error: SerializedRpcError): HappyRpcError {
    // Viem does not take kindly to the cause being a string.
    const args = { ...error, cause: new Error(error.cause) }
    if (isEIP1193ErrorCode(error.code)) return new ProviderRpcError(args)
    if (isEIP1474ErrorCode(error.code)) return new EthereumRpcError(args)
    if (error.code === RevertErrorCode) return new RevertRpcError(args.details, args.cause)

    // This should never happen, so we do a brute log to warn.
    console.log(`WARNING: unknown rpc error code: ${error.code}`)
    return new EthereumRpcError({ ...args, code: EIP1474ErrorCodes.InternalError })
}
