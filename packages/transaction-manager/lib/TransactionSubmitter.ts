import { type Hash, type Hex, type TransactionRequestEIP1559, encodeFunctionData, keccak256 } from "viem"
import { type Attempt, AttemptType, type Transaction } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"

export interface SignReturn {
    signedTransaction: Hex
    hash: Hash
}

export type AttemptSubmissionParameters = Omit<Attempt, "hash" | "gas">

export class TransactionSubmitter {
    private readonly txmgr: TransactionManager

    constructor(txmgr: TransactionManager) {
        this.txmgr = txmgr
    }

    public async attemptSubmission(transaction: Transaction, payload: AttemptSubmissionParameters): Promise<void> {
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
                return
            }

            const functionName = transaction.functionName
            const args = transaction.args
            const data = encodeFunctionData({ abi, functionName, args })

            const gas = await this.txmgr.viemClient.estimateGas({
                to: transaction.address,
                data,
                value: 0n,
            })

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

        let signedTransaction: Hex
        if (this.txmgr.viemWallet.account.signTransaction) {
            signedTransaction = await this.txmgr.viemWallet.account.signTransaction({
                ...transactionRequest,
                chainId: this.txmgr.viemWallet.chain.id,
            })
        } else {
            signedTransaction = await this.txmgr.viemWallet.signTransaction(transactionRequest)
        }

        const hash = keccak256(signedTransaction)

        transaction.addAttempt({
            type,
            hash: hash,
            nonce: nonce,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            gas: transactionRequest.gas,
        })

        await this.txmgr.transactionRepository.flush()

        await this.txmgr.viemWallet.sendRawTransaction({
            serializedTransaction: signedTransaction,
        })
    }
}
