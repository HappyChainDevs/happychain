import { HappyRpcError } from "./HappyRpcError"

/**
 * This is the code that Metamask/Infura (and maybe others?) return whenever the operation
 * causes an EVM revert (e.g. eth_call, eth_estimateGas, but also eth_sendRawTransaction (?)).
 *
 * Viem understand this error code and will use it for the purpose of parsing contract reverts, alongside
 * {@link EIP1474.InternalError}.
 *
 * cf. https://docs.metamask.io/services/reference/ethereum/json-rpc-methods/eth_call/
 * cf. https://github.com/wevm/viem/blob/viem%402.29.2/src/utils/errors/getContractError.ts#L62
 */
export const RevertErrorCode = 3

/**
 * Error signifying an EVM revert, attached to the error code {@link RevertErrorCode} — see its documentation for more
 * information.
 */
export class RevertRpcError extends HappyRpcError {
    constructor(details?: string, cause?: unknown) {
        super({ code: RevertErrorCode, shortMessage: "Transaction reverted", details, cause })
    }
}
