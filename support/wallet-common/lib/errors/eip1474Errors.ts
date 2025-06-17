// === EIP1474 ERROR CODES & DESCRIPTION ===============================================================================\

import { HappyRpcError, type HappyRpcErrorArgs } from "./HappyRpcError"

/**
 * Standard [Ethereum RPC Error Codes](https://eips.ethereum.org/EIPS/eip-1474#error-codes)
 *
 * In EIP1474, "standard" means that the error is defined in the JSON-RPC 2.0 spec, "non-standard"
 * means it is defined by EIP1474.
 *
 * Additionally, JSON-RPC providers define their own error codes (and possibly node implementations too).
 * Examples:
 * - [Infura](https://docs.metamask.io/services/reference/unichain/json-rpc-methods/#json-rpc-errors)
 * - [QuickNode](https://www.quicknode.com/docs/base/error-references#evm-rpc-error-codes)
 *
 * See also {@link EIP1193ErrorCodes}
 */
export enum EIP1474ErrorCodes {
    ParseError = -32700, // JSON-RPC (invalid JSON)
    InvalidRequest = -32600, // JSON-RPC (other validation failure)
    MethodNotFound = -32601, // JSON-RPC
    InvalidMethodParameters = -32602, // JSON-RPC (params validation failure)
    InternalError = -32603, // JSON-RPC (default for all non-specified errors)
    // While this can be used for EVM reverts, we use `RevertRpcError` instead.
    InvalidInput = -32000, // EIP1474 (params structurally valid but semantically invalid)
    // (e.g. requesting a canonical block with a block num that is known, but not canonical)
    ResourceNotFound = -32001, // EIP1474
    ResourceUnavailable = -32002, // EIP1474
    TransactionRejected = -32003, // EIP1474
    MethodNotSupported = -32004, // EIP1474 (method known but not supported)
    LimitExceeded = -32005, // EIP1474
    VersionNotSupported = -32006, // EIP1474 (JSON-RPC version unsupported)
}

export function isEIP1474ErrorCode(code: number): code is EIP1474ErrorCodes {
    return Object.values(EIP1474ErrorCodes).includes(code)
}

export const eip1474ErrorDescriptions = {
    [EIP1474ErrorCodes.ParseError]: "Invalid JSON",
    [EIP1474ErrorCodes.InvalidRequest]: "Invalid RPC request object",
    [EIP1474ErrorCodes.MethodNotFound]: "The requested RPC method does not exist",
    [EIP1474ErrorCodes.InvalidMethodParameters]: "Invalid parameters for the RPC method",
    [EIP1474ErrorCodes.InternalError]: "Internal error",
    [EIP1474ErrorCodes.InvalidInput]: "Missing or invalid parameters for the Ethereum RPC request",
    [EIP1474ErrorCodes.ResourceNotFound]: "Requested resource not found",
    [EIP1474ErrorCodes.ResourceUnavailable]: "Requested resource unavailable",
    [EIP1474ErrorCodes.TransactionRejected]: "Transaction rejected",
    [EIP1474ErrorCodes.MethodNotSupported]: "Ethereum RPC method not supported",
    [EIP1474ErrorCodes.LimitExceeded]: "Request exceeds defined limits",
    [EIP1474ErrorCodes.VersionNotSupported]: "Version not supported",
}

/**
 * General Purpose Ethereum RPC error.
 */
export class EthereumRpcError extends HappyRpcError {
    constructor(args: Omit<HappyRpcErrorArgs, "shortMessage"> & { code: EIP1474ErrorCodes }) {
        super({ ...args, shortMessage: eip1474ErrorDescriptions[args.code as EIP1474ErrorCodes] })
    }
}

/** Ethereum RPC error code -32000 */
export class EIP1474InvalidInput extends EthereumRpcError {
    constructor(details?: string, cause?: unknown) {
        super({ code: EIP1474ErrorCodes.InvalidInput, details, cause })
    }
}

/** Ethereum RPC error code -32603 */
export class EIP1474InternalError extends EthereumRpcError {
    constructor(details?: string, cause?: unknown) {
        super({ code: EIP1474ErrorCodes.InternalError, details, cause })
    }
}

/** Ethereum RPC error code -32003 */
export class EIP1474TransactionRejected extends EthereumRpcError {
    constructor(details?: string, cause?: unknown) {
        super({ code: EIP1474ErrorCodes.TransactionRejected, details, cause })
    }
}

/** Ethereum RPC error code -32003 */
export class EIP1474LimitExceeded extends EthereumRpcError {
    constructor(details?: string, cause?: unknown) {
        super({ code: EIP1474ErrorCodes.LimitExceeded, details, cause })
    }
}

export class EIP1474ResourceNotfound extends EthereumRpcError {
    constructor(details?: string, cause?: unknown) {
        super({ code: EIP1474ErrorCodes.ResourceNotFound, details, cause })
    }
}
