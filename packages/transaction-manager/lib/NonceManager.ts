import type { TransactionManager } from "./TransactionManager"

export class NonceManager {
    private txmgr: TransactionManager
    private nonce!: number

    constructor(_transactionManager: TransactionManager) {
        this.txmgr = _transactionManager
    }

    public async start() {
        const address = this.txmgr.viemWallet.account.address

        this.nonce = await this.txmgr.viemClient.getTransactionCount({
            address: address,
        })
    }

    public requestNonce(): number {
        const requestedNonce = this.nonce
        this.nonce = this.nonce + 1
        return requestedNonce
    }
}
