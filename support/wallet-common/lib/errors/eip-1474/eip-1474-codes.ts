/**
 * @see {@link https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1474.md#error-codes|JSON-RPC Error Codes (EIP-1474)}
 */
export enum RpcErrorCodes {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
    InvalidInput = -32000,
    ResourceNotFound = -32001,
    ResourceUnavailable = -32002,
    TransactionRejected = -32003,
    MethodNotSupported = -32004,
    LimitExceeded = -32005,
    JsonRpcVersionNotSupported = -32006,

    // Both types include a form of "method not found" error
    DuplicateMethodNotFound = -32042, // Duplicate of -32601 but with different code

    // Fallback error
    Unknown = -1,
}
