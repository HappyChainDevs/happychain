import { type HappyTx } from "../types"
import { RpcError } from "../types/rpc"
import { createWalletClient, createPublicClient, type PublicClient, type WalletClient } from "viem"
import { Logger } from "../logger"

export interface IRpcHandler {
    handleMethod(method: string, params: unknown[]): Promise<{ result: unknown }>
}

export class RpcHandler implements IRpcHandler {
    private walletClient: WalletClient
    private publicClient: PublicClient
    private entrypointAddress: `0x${string}`
    private logger: Logger

    constructor({
        walletClient,
        publicClient,
        entrypointAddress,
        logger
    }: {
        walletClient: WalletClient
        publicClient: PublicClient
        entrypointAddress: `0x${string}`
        logger: Logger
    }) {
        this.walletClient = walletClient
        this.publicClient = publicClient
        this.entrypointAddress = entrypointAddress
        this.logger = logger
    }

    async handleMethod(
        method: string,
        params: unknown[]
    ): Promise<{ result: unknown }> {
        switch (method) {
            case "happy_sendTransaction": {
                const [happyTx] = params as [HappyTx]
                if (!happyTx) {
                    throw new RpcError("Missing HappyTx parameter", -32602)
                }
                
                this.logger.info({ happyTx }, "Submitting HappyTx")
                
                const hash = await this.walletClient.writeContract({
                    address: this.entrypointAddress,
                    abi: [
                        "function handleOps(tuple(address account, uint32 gasLimit, uint32 executeGasLimit, address dest, address paymaster, uint256 value, uint256 nonce, uint256 maxFeePerGas, int256 submitterFee, bytes callData, bytes paymasterData, bytes validatorData, bytes extraData)[] ops) external"
                    ],
                    functionName: "handleOps",
                    args: [[happyTx]]
                })

                const receipt = await this.publicClient.waitForTransactionReceipt({ 
                    hash 
                })

                return { result: receipt.transactionHash }
            }

            default:
                throw new RpcError(`Method ${method} not supported`, -32601)
        }
    }
}
