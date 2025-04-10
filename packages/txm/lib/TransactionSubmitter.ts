import { type Result, err, ok } from "neverthrow"
import type { TransactionRequestEIP1559 } from "viem"
import { TransactionRejectedRpcError, encodeFunctionData, keccak256 } from "viem"
import type { EstimateGasErrorCause } from "./GasEstimator.js"
import { type Attempt, AttemptType, type Transaction } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"

export type AttemptSubmissionParameters = Omit<Attempt, "hash" | "gas">

export enum AttemptSubmissionErrorCause {
    ABINotFound = "ABINotFound",
    FailedToUpdate = "FailedToUpdate",
    FailedToEstimateGas = "FailedToEstimateGas",
    FailedToSignTransaction = "FailedToSignTransaction",
    FailedToSendRawTransaction = "FailedToSendRawTransaction",
}

export type AttemptSubmissionError = {
    cause: AttemptSubmissionErrorCause | EstimateGasErrorCause
    description: string
    flushed: boolean
}

export type AttemptSubmissionResult = Result<undefined, AttemptSubmissionError>

/**
 * This module is responsible for submitting a new attempt to the blockchain.
 * It coordinates the process using a transaction and an {@link AttemptSubmissionParameters}.
 *
 * This module given that information is in charge of:
 * - Requesting a nonce
 * - Estimating the gas limit and pulling the gas price
 * - Signing the transaction
 * - Adding the attempt to the transaction attempts list.
 * - Flushing the transaction. We do this **before** sending the transaction, to avoid the case where the transaction is
 * sent successfully but not saved to the DB (because of an app/server/… crash),
 * which would cause us to lose information (there would be an untracked attempt in flight).
 * - Sending the transaction to the RPC
 */
export class TransactionSubmitter {
    private readonly txmgr: TransactionManager

    constructor(txmgr: TransactionManager) {
        this.txmgr = txmgr
    }

    public async submitNewAttempt(
        transaction: Transaction,
        payload: AttemptSubmissionParameters,
    ): Promise<AttemptSubmissionResult> {
        const { nonce, maxFeePerGas, maxPriorityFeePerGas, type } = payload

        return await this.sendAttempt(
            transaction,
            {
                type,
                nonce,
                maxFeePerGas,
                maxPriorityFeePerGas,
            },
            true,
        )
    }

    async resubmitAttempt(transaction: Transaction, attempt: Attempt): Promise<AttemptSubmissionResult> {
        return await this.sendAttempt(transaction, attempt, false)
    }

    private async sendAttempt(
        transaction: Transaction,
        attempt: Omit<Attempt, "hash" | "gas"> & Partial<Pick<Attempt, "hash" | "gas">>,
        saveAttempt = false,
    ): Promise<AttemptSubmissionResult> {
        let transactionRequest: TransactionRequestEIP1559 & { gas: bigint }

        if (attempt.type === AttemptType.Cancellation) {
            transactionRequest = {
                type: "eip1559",
                from: this.txmgr.viemWallet.account.address,
                to: this.txmgr.viemWallet.account.address,
                data: "0x",
                value: 0n,
                nonce: attempt.nonce,
                maxFeePerGas: attempt.maxFeePerGas,
                maxPriorityFeePerGas: attempt.maxPriorityFeePerGas,
                gas: attempt.gas ?? 21000n,
            }
        } else {
            const abi = this.txmgr.abiManager.get(transaction.contractName)

            if (!abi) {
                return err({
                    cause: AttemptSubmissionErrorCause.ABINotFound,
                    description: `ABI not found for contract ${transaction.contractName}`,
                    flushed: false,
                })
            }

            const functionName = transaction.functionName
            const args = transaction.args
            const data = encodeFunctionData({ abi, functionName, args })

            let gas: bigint
            if (attempt.gas === undefined) {
                const gasResult = await this.txmgr.gasEstimator.estimateGas(this.txmgr, transaction)

                if (gasResult.isErr()) {
                    return err({
                        cause: gasResult.error.cause,
                        description: gasResult.error.description,
                        flushed: false,
                    })
                }

                gas = gasResult.value
            } else {
                gas = attempt.gas
            }

            transactionRequest = {
                type: "eip1559",
                from: this.txmgr.viemWallet.account.address,
                to: transaction.address,
                data,
                value: 0n,
                nonce: attempt.nonce,
                maxFeePerGas: attempt.maxFeePerGas,
                maxPriorityFeePerGas: attempt.maxPriorityFeePerGas,
                gas,
            }
        }

        const signedTransactionResult = await this.txmgr.viemWallet.safeSignTransaction(transactionRequest)

        if (signedTransactionResult.isErr()) {
            return err({
                cause: AttemptSubmissionErrorCause.FailedToSignTransaction,
                description: `Failed to sign transaction ${transaction.intentId} for retry. Details: ${signedTransactionResult.error}`,
                flushed: false,
            })
        }

        const signedTransaction = signedTransactionResult.value

        const hash = keccak256(signedTransaction)

        if (saveAttempt) {
            transaction.addAttempt({
                type: attempt.type,
                hash: hash,
                nonce: attempt.nonce,
                maxFeePerGas: attempt.maxFeePerGas,
                maxPriorityFeePerGas: attempt.maxPriorityFeePerGas,
                gas: transactionRequest.gas,
            })

            const updateResult = await this.txmgr.transactionRepository.saveTransactions([transaction])

            if (updateResult.isErr()) {
                transaction.removeAttempt(hash)

                return err({
                    cause: AttemptSubmissionErrorCause.FailedToUpdate,
                    description: `Failed to update transaction ${transaction.intentId}. Details: ${updateResult.error}`,
                    flushed: false,
                })
            }
        }

        const sendRawTransactionResult = await this.txmgr.viemWallet.safeSendRawTransaction({
            serializedTransaction: signedTransaction,
        })

        if (sendRawTransactionResult.isErr()) {
            if (
                sendRawTransactionResult.error instanceof TransactionRejectedRpcError &&
                sendRawTransactionResult.error.message.includes("nonce too low")
            ) {
                this.txmgr.nonceManager.resync()
            }

            this.txmgr.rpcLivenessMonitor.trackError()
            return err({
                cause: AttemptSubmissionErrorCause.FailedToSendRawTransaction,
                description: `Failed to send raw transaction ${transaction.intentId} for retry. Details: ${sendRawTransactionResult.error}`,
                flushed: saveAttempt,
            })
        }

        this.txmgr.rpcLivenessMonitor.trackSuccess()

        return ok(undefined)
    }
}
