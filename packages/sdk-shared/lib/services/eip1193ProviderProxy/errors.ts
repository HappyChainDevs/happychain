import type { ProviderRpcErrorCode } from 'viem'

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

/**
 * General Purpose Provider RPC error.
 * Can be instantiated from the deserialized ErrorObject
 */
export class GenericProviderRpcError extends Error implements IProviderRpcError {
    code: ProviderRpcErrorCode
    data?: unknown
    constructor(errObj: EIP1193ErrorObject) {
        super(errObj.message)
        this.code = errObj.code
        this.data = errObj.data
    }
}

/**
 * EIP1193 Specific Errors
 */
export class EIP1193UserRejectedRequestError extends GenericProviderRpcError {
    constructor() {
        super({
            code: 4001,
            data: 'User Rejected Request',
            message: 'User Rejected Request',
        })
    }
}

export class EIP1193UnauthorizedError extends GenericProviderRpcError {
    constructor() {
        super({
            code: 4100,
            data: 'Unauthorized',
            message: 'Unauthorized',
        })
    }
}
export class EIP1193UnsupportedMethodError extends GenericProviderRpcError {
    constructor() {
        super({
            code: 4200,
            data: 'Unsupported Method',
            message: 'Unsupported Method',
        })
    }
}
export class EIP1193DisconnectedError extends GenericProviderRpcError {
    constructor() {
        super({
            code: 4900,
            data: 'Disconnected',
            message: 'Disconnected',
        })
    }
}
export class EIP1193ChainDisconnectedError extends GenericProviderRpcError {
    constructor() {
        super({
            code: 4901,
            data: 'Chain Disconnected',
            message: 'Chain Disconnected',
        })
    }
}
export class EIP1193ChainNotRecognizedError extends GenericProviderRpcError {
    constructor() {
        super({
            code: 4902,
            data: 'Chain Not Recognized',
            message: 'Chain Not Recognized',
        })
    }
}
