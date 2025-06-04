import { formatEther, parseEther } from "viem"
import type { Account, Address, Hash } from "viem"
import { env } from "#lib/env"
import { publicClient, walletClient } from "#lib/utils/clients"
import { resyncLogger } from "#lib/utils/logger"
import type { BoopNonceManager } from "./BoopNonceManager"
import { findExecutionAccount } from "./evmAccounts"

export class ResyncService {
    private readonly maxPriorityFee: bigint = parseEther(env.MAX_RESYNC_PRIORITY_FEE_GWEI ?? "10", "gwei")
    private readonly initialPriorityFee: bigint = parseEther("10", "gwei")
    private readonly retryDelayMs: number = 2000 // 2 seconds between retries

    constructor(private readonly nonceManager: BoopNonceManager) {}

    /**
     * Resync routine to be run on submitter startup
     * 1. For each account, fetches latest and pending nonces
     * 2. Syncs until they match
     * 3. Sends cancel transactions for in-flight transactions
     */
    public async resyncOnStartup(): Promise<void> {
        resyncLogger.info("Starting resync routine on submitter startup")

        // Get the first executor account
        const sender = findExecutionAccount()
        if (!sender) {
            throw new Error("No executor account available for resync")
        }

        const senderAddress = sender.address

        try {
            // Get latest and pending nonces
            const latestNonce = await publicClient.getTransactionCount({
                address: senderAddress,
            })

            const pendingNonce = await publicClient.getTransactionCount({
                address: senderAddress,
                blockTag: "pending",
            })

            resyncLogger.info(
                `Resync - Account: ${senderAddress}, Latest nonce: ${latestNonce}, Pending nonce: ${pendingNonce}`,
            )

            // If latest and pending nonces are the same, no action needed
            if (latestNonce === pendingNonce) {
                resyncLogger.info("No in-flight transactions detected, resync complete")
                return
            }

            // Process in-flight transactions
            for (let nonce = latestNonce; nonce < pendingNonce; nonce++) {
                resyncLogger.info(`Resync - Sending cancel transaction for nonce ${nonce}`)
                await this.sendCancelTransaction(sender, senderAddress, nonce)
            }

            resyncLogger.info("Resync routine completed successfully")
        } catch (error) {
            resyncLogger.error("Error during resync routine", error)
            throw new Error("Resync routine failed: " + (error as Error).message)
        }
    }

    /**
     * Send a cancel transaction for a specific nonce
     * Uses a zero-value transaction to the same address (self-transfer) with a higher gas price
     */
    private async sendCancelTransaction(sender: Account, address: Address, nonce: number): Promise<Hash | undefined> {
        let priorityFee = this.initialPriorityFee
        let attempts = 0
        const maxAttempts = 5

        while (attempts < maxAttempts) {
            try {
                // Check if we've exceeded the max priority fee
                if (priorityFee > this.maxPriorityFee) {
                    throw new Error(`Max priority fee exceeded (${formatEther(priorityFee, "gwei")} gwei)`)
                }

                resyncLogger.info(
                    `Sending cancel transaction with nonce ${nonce}, priority fee: ${formatEther(priorityFee, "gwei")} gwei`,
                )

                // Send a self-transfer with 0 value as a cancel transaction
                const hash = await walletClient.sendTransaction({
                    account: sender,
                    to: address,
                    value: 0n,
                    nonce,
                    maxPriorityFeePerGas: priorityFee,
                })

                resyncLogger.info(`Cancel transaction sent: ${hash}`)

                // Wait for nonce to update instead of receipt
                const success = await this.waitForNonceUpdate(address, BigInt(nonce))

                if (success) {
                    return hash
                } else {
                    // If nonce hasn't updated, double the priority fee and try again
                    priorityFee = priorityFee * 2n
                    attempts++
                    resyncLogger.info(
                        `Transaction not mined, increasing priority fee to ${formatEther(priorityFee, "gwei")} gwei`,
                    )
                }
            } catch (error) {
                resyncLogger.error(`Error sending cancel transaction for nonce ${nonce}:`, error)
                attempts++
                await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs))
            }
        }

        resyncLogger.error(`Failed to send cancel transaction for nonce ${nonce} after ${maxAttempts} attempts`)
        return undefined
    }

    /**
     * Wait for a nonce to update by polling getTransactionCount
     * @returns true if the nonce has updated, false otherwise
     */
    private async waitForNonceUpdate(address: Address, nonce: bigint): Promise<boolean> {
        const maxPolls = 30
        const pollDelayMs = 2000 // 2 seconds between polls

        for (let i = 0; i < maxPolls; i++) {
            const currentNonce = await publicClient.getTransactionCount({
                address: address,
            })

            if (BigInt(currentNonce) > nonce) {
                return true
            }

            // Setup block subscription to monitor gas usage
            // Note: This is just for one poll cycle
            const unsubscribe = await publicClient.watchBlocks({
                onBlock: async (block) => {
                    const blockGasLimit = block.gasLimit
                    const blockGasUsed = block.gasUsed
                    const gasLeft = blockGasLimit - blockGasUsed
                    resyncLogger.trace(`New block: ${block.number}, gas used: ${blockGasUsed}, gas left: ${gasLeft}`)
                },
            })

            // Wait for next poll
            await new Promise((resolve) => setTimeout(resolve, pollDelayMs))
            unsubscribe()
        }

        return false
    }
}
