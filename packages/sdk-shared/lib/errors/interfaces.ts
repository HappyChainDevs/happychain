import type { ProviderRpcErrorCode as ViemProviderRpcErrorCode } from "viem"

/**
 * We will use -1 to signify unknown error types.
 */
export type ProviderRpcErrorCode = ViemProviderRpcErrorCode | -1

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

/**
 * Interface from EIP1193
 * https://eips.ethereum.org/EIPS/eip-1193#errors
 */
export interface IProviderRpcError extends Error {
    message: string
    code: ProviderRpcErrorCode
    data?: unknown
}
