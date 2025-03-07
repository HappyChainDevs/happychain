import { ValueType, metrics } from "@opentelemetry/api"
import type { TransactionManager } from "./TransactionManager"

const meter = metrics.getMeter("txm.nonce-manager")

const nonceManagerGauge = meter.createGauge("txm.nonce-manager.nonce", {
    description: "Current nonce",
    unit: "count",
    valueType: ValueType.INT,
})

const returnedNonceCounter = meter.createCounter("txm.nonce-manager.returned-nonce", {
    description: "Number of transaction nonces that were reserved but returned to the queue",
    unit: "count",
    valueType: ValueType.INT,
})

const returnedNonceQueueGauge = meter.createGauge("txm.nonce-manager.returned-nonce-queue", {
    description: "Quantity of returned nonces in the queue",
    unit: "count",
    valueType: ValueType.INT,
})

/*
 * This class manages the nonce of the account that the transaction manager is using.
 *
 * This is critical because a gap in the nonces would mean that transactions sent by the manager are never included onchain.
 *
 * Assumes that it's the only user of the account from the moment it is initialized.
 *
 * It's designed to be fault-tolerant, meaning that if a failure occurs, it will recover the latest state from the database and the RPC.
 *
 * The module must be initialized first. During initialization, it retrieves the transaction count from the RPC,
 * which represents the expected next nonce without considering potential pending transactions in the mempool.
 *
 * To handle this scenario, we check for pending transactions in our database and identify the last nonce of these transactions.
 *
 * We also check for gaps in the pending transactions, aiming to use these gaps before assigning new nonces, thus eliminating nonce gaps.
 *
 * Once started, this module exposes two public methods. The first is `public requestNonce(): number`.
 *
 * This is an atomic method (as it doesn't await any promises, and Node.js is single-threaded)
 * that provides and reserves a nonce when you need to emit a new transaction.
 *
 * The second method is `public returnNonce(nonce: number)`. It's used when you've reserved a nonce, but the transaction hasn't reached the mempool.
 *
 * In this case, the nonce isn't actually used, and if we don't return it, it would cause a nonce gap.
 */
export class NonceManager {
    private txmgr: TransactionManager
    private nonce!: number
    private returnedNonceQueue!: number[]

    maxExecutedNonce: number

    constructor(_transactionManager: TransactionManager) {
        this.txmgr = _transactionManager
        this.returnedNonceQueue = []
        this.maxExecutedNonce = 0
    }

    public async start() {
        const address = this.txmgr.viemWallet.account.address

        const blockchainNonce = await this.txmgr.viemClient.getTransactionCount({
            address: address,
        })

        this.maxExecutedNonce = blockchainNonce

        const highestDbNonce = this.txmgr.transactionRepository.getHighestNonce()

        if (!highestDbNonce || highestDbNonce < blockchainNonce) {
            this.nonce = blockchainNonce
            this.returnedNonceQueue = []
        } else {
            this.nonce = highestDbNonce + 1
            this.returnedNonceQueue = this.txmgr.transactionRepository
                .getNotReservedNoncesInRange(blockchainNonce, highestDbNonce)
                .sort((a, b) => a - b)
        }
    }

    public requestNonce(): number {
        if (this.returnedNonceQueue.length > 0) {
            const nonce = this.returnedNonceQueue.shift()!
            returnedNonceQueueGauge.record(this.returnedNonceQueue.length)
            return nonce
        }

        const requestedNonce = this.nonce
        this.nonce = this.nonce + 1
        nonceManagerGauge.record(this.nonce)
        return requestedNonce
    }

    // Only called when a transaction that has reserved a nonce ultimately doesn't reach the mempool
    public returnNonce(nonce: number) {
        const index = this.returnedNonceQueue.findIndex((n) => nonce > n)

        if (index === -1) {
            this.returnedNonceQueue.push(nonce)
        } else {
            this.returnedNonceQueue.splice(index, 0, nonce)
        }

        returnedNonceCounter.add(1)
        returnedNonceQueueGauge.record(this.returnedNonceQueue.length)
    }

    public async resync() {
        const address = this.txmgr.viemWallet.account.address

        const blockchainNonce = await this.txmgr.viemClient.getTransactionCount({
            address: address,
        })

        this.maxExecutedNonce = blockchainNonce
    }
}
