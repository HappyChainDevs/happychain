import type { EIP1193ErrorCodes } from "./eip-1193-codes"

/**
 * We will use -1 to signify unknown error types.
 *
 * Standard error codes from {@link https://eips.ethereum.org/EIPS/eip-1193#provider-errors}
 *
 * Non-Standard error codes from {@link https://github.com/wevm/viem/blob/9dc0724ae09827bd12c612df1d73b50fadf3c982/src/errors/rpc.ts#L64}
 *
 * -1 for unknown
 */
export type ProviderRpcErrorCode =
    | EIP1193ErrorCodes.UserRejectedRequest
    | EIP1193ErrorCodes.Unauthorized
    | EIP1193ErrorCodes.UnsupportedMethod
    | EIP1193ErrorCodes.Disconnected
    | EIP1193ErrorCodes.ChainDisconnected
    | EIP1193ErrorCodes.SwitchChainError
    | EIP1193ErrorCodes.Unknown

/**
 * Error Object is used to transmit error messages
 * across MessageChannel and BroadcastChannels.
 * This requires the data to be JSON serializable
 * so we can't send the raw Error class
 */
export type EIP1193ErrorObject = {
    code: ProviderRpcErrorCode
    message: string
    data?: unknown
}
