import type { ProviderRpcErrorCode as ViemProviderRpcErrorCode } from "viem"
import type { RpcErrorCodes } from "../eip-1474"

export type ProviderRpcErrorCode = ViemProviderRpcErrorCode

/**
 * Error Object is used to transmit error messages
 * across MessageChannel and BroadcastChannels.
 * This requires the data to be JSON serializable
 * so we can't send the raw Error class
 */
export type EIP1193ErrorObject = {
    code: ProviderRpcErrorCode | RpcErrorCodes
    message: string
    data?: unknown
}
