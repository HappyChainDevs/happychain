import type { RpcErrorCode as ViemRpcErrorCode } from "viem"

export type JsonRpcErrorCode = ViemRpcErrorCode

/**
 * Simplified error object format for internal use
 * when constructing error instances
 */
export type EIP1474ErrorParams = {
    code: ViemRpcErrorCode
    message: string
    data?: unknown
}

/**
 * EIP-1474 Error Object for JSON-RPC 2.0 responses.
 *
 * Follows the standard format defined in
 * {@link https://eips.ethereum.org/EIPS/eip-1474|EIP-1474}.
 */
export type EIP1474ErrorObject = {
    id: number | string | null
    jsonrpc: "2.0"
    error: EIP1474ErrorParams
}
