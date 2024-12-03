import type { TransactionManager } from "./TransactionManager"

export class NonceManager {
    private txmgr: TransactionManager
    private nonce!: number

    private returnedNonceQueue!: number[]

    constructor(_transactionManager: TransactionManager) {
        this.txmgr = _transactionManager
    }

    public async start() {
        const address = this.txmgr.viemWallet.account.address

        const blockchainNonce = await this.txmgr.viemClient.getTransactionCount({
            address: address,
        })

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
            return this.returnedNonceQueue.shift()!
        }

        const requestedNonce = this.nonce
        this.nonce = this.nonce + 1
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
    }
}
