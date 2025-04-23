/**
 * Standard Ethereum RPC Error Codes {@link https://eips.ethereum.org/EIPS/eip-1474#error-codes}
 *
 * In EIP1474, "standard" means that the error is defined in the JSON-RPC 2.0 spec, "non-standard"
 * means it is defined by EIP1474.
 *
 * Additionally, JSON-RPC providers define their own error codes (and possibly node implementations too).
 * Examples:
 * - {@link Infura | https://docs.metamask.io/services/reference/unichain/json-rpc-methods/#json-rpc-errors}
 * - {@link QuickNode | https://www.quicknode.com/docs/base/error-references#evm-rpc-error-codes}
 *
 * See also {@link EIP1193ErrorCodes}
 */
export enum EIP1474ErrorCodes {
    /** Parse error - Invalid JSON, JSON-RPC standard */
    ParseError = -32700,
    /** Invalid request - JSON is not a valid request object, JSON-RPC standard */
    InvalidRequest = -32600,
    /** Method not found - Method does not exist, JSON-RPC standard */
    MethodNotFound = -32601,
    /** Invalid Method Parameters, JSON-RPC standard */
    InvalidMethodParameters = -32602,
    /** Internal error - Internal JSON-RPC error, JSON-RPC standard */
    InternalError = -32603,
    /** Invalid input - Missing or invalid parameters, EIP1474 standard */
    InvalidInput = -32000,
    /** Resource not found - Requested resource not found, EIP1474 standard */
    ResourceNotFound = -32001,
    /** Resource unavailable - Requested resource not available, EIP1474 standard */
    ResourceUnavailable = -32002,
    /** Transaction rejected - Transaction creation failed, EIP1474 standard */
    TransactionRejected = -32003,
    /** Method not supported - Method is not implemented, EIP1474 standard */
    MethodNotSupported = -32004,
    /** Limit exceeded - Request exceeds defined limit, EIP1474 standard */
    LimitExceeded = -32005,
    /** JSON-RPC version not supported - Version of JSON-RPC protocol is not supported, EIP1474 standard */
    VersionNotSupported = -32006,
}

/**
 * General Purpose Ethereum RPC error.
 */
export class GenericEthereumRpcError extends Error {
    code: EIP1474ErrorCodes
    constructor(code: EIP1474ErrorCodes, message: string) {
        super(message)
        this.code = code
    }
}

/**
 * Error: -32000 Invalid Input
 */
export class EIP1474InvalidInput extends GenericEthereumRpcError {
    constructor(message: string) {
        super(EIP1474ErrorCodes.InvalidInput, message)
    }
}
