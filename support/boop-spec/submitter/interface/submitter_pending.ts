import type { Address, Hash, UInt256 } from "@happy.tech/common"

export type PendingHappyTxInfo = {
    hash: Hash
    nonce: UInt256
    submitted: number
}

/**
 * GET /submitter_pending/${account}
 *
 * Returns a list of pending (not yet included on chain) HappyTx (identified by their hash and
 * nonce) for the given account.
 */
export declare function submitter_pending(account: Address): PendingHappyTxInfo[]
