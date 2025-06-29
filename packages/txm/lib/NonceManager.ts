import { SpanStatusCode, context, trace } from "@opentelemetry/api"
import type { TransactionManager } from "./TransactionManager"
import { TxmMetrics } from "./telemetry/metrics"
import { TraceMethod } from "./telemetry/traces"
import { logger } from "./utils/logger"

/**
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

        const blockchainNonceResult = await this.txmgr.viemClient.safeGetTransactionCount({
            address: address,
        })

        if (blockchainNonceResult.isErr()) {
            logger.error(`Failed to get transaction count for address ${address}`, {
                error: blockchainNonceResult.error,
            })
            throw new Error("Failed to get transaction count for address")
        }

        const blockchainNonce = blockchainNonceResult.value

        this.maxExecutedNonce = blockchainNonce - 1

        const highestDbNonce = this.txmgr.transactionRepository.getHighestNonce()

        if (!highestDbNonce || highestDbNonce < blockchainNonce) {
            this.nonce = blockchainNonce
            this.returnedNonceQueue = []
        } else {
            this.nonce = highestDbNonce + 1
            this.returnedNonceQueue = this.txmgr.transactionRepository
                .getNotReservedNoncesInRange(this.maxExecutedNonce, highestDbNonce)
                .sort((a, b) => a - b)
        }
    }

    @TraceMethod("txm.nonce-manager.request-nonce")
    public requestNonce(): number {
        const span = trace.getSpan(context.active())!

        if (this.returnedNonceQueue.length > 0) {
            const nonce = this.returnedNonceQueue.shift()!
            span.addEvent("txm.nonce-manager.request-nonce.from-queue", {
                nonce,
            })
            TxmMetrics.getInstance().returnedNonceQueueGauge.record(this.returnedNonceQueue.length)
            return nonce
        }

        const requestedNonce = this.nonce
        this.nonce = this.nonce + 1

        span.addEvent("txm.nonce-manager.request-nonce.new-nonce", {
            nonce: requestedNonce,
        })

        TxmMetrics.getInstance().nonceManagerGauge.record(this.nonce)
        return requestedNonce
    }

    // Only called when a transaction that has reserved a nonce ultimately doesn't reach the mempool
    @TraceMethod("txm.nonce-manager.return-nonce")
    public returnNonce(nonce: number) {
        const span = trace.getSpan(context.active())!

        const index = this.returnedNonceQueue.findIndex((n) => nonce < n)

        if (index === -1) {
            this.returnedNonceQueue.push(nonce)
        } else {
            this.returnedNonceQueue.splice(index, 0, nonce)
        }

        span.addEvent("txm.nonce-manager.return-nonce.added-to-queue", {
            nonce,
        })

        TxmMetrics.getInstance().returnedNonceCounter.add(1)
        TxmMetrics.getInstance().returnedNonceQueueGauge.record(this.returnedNonceQueue.length)
    }

    @TraceMethod("txm.nonce-manager.resync")
    public async resync() {
        const span = trace.getSpan(context.active())!

        const address = this.txmgr.viemWallet.account.address

        const blockchainNonceResult = await this.txmgr.viemClient.safeGetTransactionCount({
            address: address,
        })

        if (blockchainNonceResult.isErr()) {
            logger.error(`Failed to get transaction count for address ${address}`, {
                error: blockchainNonceResult.error,
            })
            this.txmgr.rpcLivenessMonitor.trackError()
            span.recordException(blockchainNonceResult.error)
            span.setStatus({ code: SpanStatusCode.ERROR })
            return
        }

        this.txmgr.rpcLivenessMonitor.trackSuccess()

        this.maxExecutedNonce = blockchainNonceResult.value - 1

        span.addEvent("txm.nonce-manager.resync.updated-max-executed-nonce", {
            maxExecutedNonce: this.maxExecutedNonce,
        })
    }
}
