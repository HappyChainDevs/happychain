import { type Result, err, ok } from "neverthrow"
import type { Hash, Hex, TransactionRequestEIP1559 } from "viem"
import { encodeFunctionData, keccak256 } from "viem"
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
    flushed: boolean
}

export type AttemptSubmissionResult = Result<undefined, AttemptSubmissionError>

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
                console.error(`ABI not found for contract ${transaction.contractName}`)
                return err({ cause: AttemptSubmissionErrorCause.ABINotFound, flushed: false })
            }

            const functionName = transaction.functionName
            const args = transaction.args
            const data = encodeFunctionData({ abi, functionName, args })

            const gasResult = await this.txmgr.gasEstimator.estimateGas(this.txmgr, transaction)

            if (gasResult.isErr()) {
                return err({ cause: gasResult.error, flushed: false })
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
            return err({ cause: AttemptSubmissionErrorCause.FailedToSignTransaction, flushed: false })
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

        const updateResult = await this.txmgr.transactionRepository.updateTransaction(transaction)

        if (updateResult.isErr()) {
            transaction.removeAttempt(hash)
            return err({ cause: AttemptSubmissionErrorCause.FailedToUpdate, flushed: false })
        }

        const sendRawTransactionResult = await this.txmgr.viemWallet.safeSendRawTransaction({
            serializedTransaction: signedTransaction,
        })

        if (sendRawTransactionResult.isErr()) {
            return err({ cause: AttemptSubmissionErrorCause.FailedToSendRawTransaction, flushed: true })
        }

        return ok(undefined)
    }
}
