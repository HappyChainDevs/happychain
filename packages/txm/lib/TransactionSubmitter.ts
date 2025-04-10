import { bigIntReplacer } from "@happy.tech/common"
import { SpanStatusCode, context, trace } from "@opentelemetry/api"
import { type Result, err, ok } from "neverthrow"
import type { TransactionRequestEIP1559 } from "viem"
import { TransactionRejectedRpcError, encodeFunctionData, keccak256 } from "viem"
import type { EstimateGasErrorCause } from "./GasEstimator.js"
import { type Attempt, AttemptType, type Transaction } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"
import { TraceMethod } from "./telemetry/traces"
import { logger } from "./utils/logger"

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

    @TraceMethod("txm.transaction-submitter.submit-new-attempt")
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

    @TraceMethod("txm.transaction-submitter.resubmit-attempt")
    async resubmitAttempt(transaction: Transaction, attempt: Attempt): Promise<AttemptSubmissionResult> {
        return await this.sendAttempt(transaction, attempt, false)
    }

    @TraceMethod("txm.transaction-submitter.send-attempt")
    private async sendAttempt(
        transaction: Transaction,
        attempt: Omit<Attempt, "hash" | "gas"> & Partial<Pick<Attempt, "hash" | "gas">>,
        saveAttempt = false,
    ): Promise<AttemptSubmissionResult> {
        const span = trace.getSpan(context.active())!

        span.addEvent("txm.transaction-submitter.send-attempt.started", {
            transactionIntentId: transaction.intentId,
            transaction: transaction.toJson(),
            payload: JSON.stringify(attempt, bigIntReplacer),
        })

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
            let gas: bigint
            if (attempt.gas === undefined) {
                const gasResult = await this.txmgr.gasEstimator.estimateGas(this.txmgr, transaction)

                if (gasResult.isErr()) {
                    span.addEvent("txm.transaction-submitter.send-attempt.gas-estimation-failed", {
                        transactionIntentId: transaction.intentId,
                        description: gasResult.error.description,
                    })
                    span.setStatus({ code: SpanStatusCode.ERROR })
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
                data: transaction.calldata,
                value: 0n,
                nonce: attempt.nonce,
                maxFeePerGas: attempt.maxFeePerGas,
                maxPriorityFeePerGas: attempt.maxPriorityFeePerGas,
                gas,
            }
        }

        const signedTransactionResult = await this.txmgr.viemWallet.safeSignTransaction(transactionRequest)

        if (signedTransactionResult.isErr()) {
            const description = `Failed to sign transaction ${transaction.intentId}. Details: ${signedTransactionResult.error}`
            span.addEvent("txm.transaction-submitter.attempt-submission.failed-to-sign-transaction", {
                transactionIntentId: transaction.intentId,
                description,
            })
            span.recordException(signedTransactionResult.error)
            span.setStatus({ code: SpanStatusCode.ERROR })
            return err({
                cause: AttemptSubmissionErrorCause.FailedToSignTransaction,
                description,
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
            const description = `Failed to send raw transaction ${transaction.intentId}. Details: ${sendRawTransactionResult.error}`
            span.addEvent("txm.transaction-submitter.attempt-submission.failed-to-send-raw-transaction", {
                transactionIntentId: transaction.intentId,
                description,
            })
            span.recordException(sendRawTransactionResult.error)
            span.setStatus({ code: SpanStatusCode.ERROR })
            if (
                sendRawTransactionResult.error instanceof TransactionRejectedRpcError &&
                sendRawTransactionResult.error.message.includes("nonce too low")
            ) {
                span.addEvent("txm.transaction-submitter.attempt-submission.nonce-too-low", {
                    transactionIntentId: transaction.intentId,
                    nonce: attempt.nonce,
                })
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
