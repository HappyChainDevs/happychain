import type { Address, Hash, UInt256 } from "./common_chain"

export type PendingHappyTxInput = {
    account: Address
}

export type PendingHappyTxOutput = {
    pending: PendingHappyTxInfo[]
}

export type PendingHappyTxInfo = {
    hash: Hash
    nonceTrack: UInt256
    nonceValue: UInt256
    submitted: boolean
}

/**
 * GET /submitter_pending/${account}
 *
 * Returns a list of pending (not yet included on chain) HappyTx (identified by their hash and
 * nonce) for the given account.
 */
export declare function submitter_pending(account: Address): PendingHappyTxInfo[]
