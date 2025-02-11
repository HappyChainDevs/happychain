import { LogTag } from "@happy.tech/common"
import { Logger } from "@happy.tech/common"
import { type Result, err, ok } from "neverthrow"
import type { Hash, Hex, TransactionRequestEIP1559 } from "viem"
import { TransactionRejectedRpcError, encodeFunctionData, keccak256 } from "viem"
import type { EstimateGasErrorCause } from "./GasEstimator.js"
import { type Attempt, AttemptType, type Transaction } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"

export interface SignReturn {
    signedTransaction: Hex
    hash: Hash
}

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

    public async attemptSubmission(
        transaction: Transaction,
        payload: AttemptSubmissionParameters,
    ): Promise<AttemptSubmissionResult> {
        const { nonce, maxFeePerGas, maxPriorityFeePerGas, type } = payload

        let transactionRequest: TransactionRequestEIP1559 & { gas: bigint }
        if (type === AttemptType.Cancellation) {
            transactionRequest = {
                type: "eip1559",
                from: this.txmgr.viemWallet.account.address,
                to: this.txmgr.viemWallet.account.address,
                data: "0x",
                value: 0n,
                nonce,
                maxFeePerGas,
                maxPriorityFeePerGas,
                gas: 21000n,
            }
        } else {
            const abi = this.txmgr.abiManager.get(transaction.contractName)

            if (!abi) {
                Logger.instance.error(LogTag.TXM, `ABI not found for contract ${transaction.contractName}`)
                return err({
                    cause: AttemptSubmissionErrorCause.ABINotFound,
                    description: `ABI not found for contract ${transaction.contractName}`,
                    flushed: false,
                })
            }

            const functionName = transaction.functionName
            const args = transaction.args
            const data = encodeFunctionData({ abi, functionName, args })

            const gasResult = await this.txmgr.gasEstimator.estimateGas(this.txmgr, transaction)

            if (gasResult.isErr()) {
                return err({
                    cause: gasResult.error.cause,
                    description: gasResult.error.description,
                    flushed: false,
                })
            }

            const gas = gasResult.value

            transactionRequest = {
                type: "eip1559",
                from: this.txmgr.viemWallet.account.address,
                to: transaction.address,
                data,
                value: 0n,
                nonce,
                maxFeePerGas,
                maxPriorityFeePerGas,
                gas,
            }
        }

        const signedTransactionResult = await this.txmgr.viemWallet.safeSignTransaction(transactionRequest)

        if (signedTransactionResult.isErr()) {
            return err({
                cause: AttemptSubmissionErrorCause.FailedToSignTransaction,
                description: `Failed to sign transaction ${transaction.intentId}. Details: ${signedTransactionResult.error}`,
                flushed: false,
            })
        }

        const signedTransaction = signedTransactionResult.value

        const hash = keccak256(signedTransaction)

        transaction.addAttempt({
            type,
            hash: hash,
            nonce: nonce,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
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
            return err({
                cause: AttemptSubmissionErrorCause.FailedToSendRawTransaction,
                description: `Failed to send raw transaction ${transaction.intentId}. Details: ${sendRawTransactionResult.error}`,
                flushed: true,
            })
        }

        return ok(undefined)
    }
}
