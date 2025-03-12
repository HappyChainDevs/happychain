import type { ProviderRpcErrorCode as ViemProviderRpcErrorCode } from "viem"

// TODO remove the -1
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
