import type { Address, Hash, UInt256 } from "@happy.tech/common"

export type PendingBoopInput = {
    account: Address
}

export type PendingBoopOutput = {
    pending: PendingBoopInfo[]
}

export type PendingBoopInfo = {
    hash: Hash
    nonceTrack: UInt256
    nonceValue: UInt256
    submitted: boolean
}

/**
 * GET `/api/v1/boop/pending/{account}`
 *
 * Returns a list of pending (not yet included on chain) Boop (identified by their hash and
 * nonce) for the given account.
 */
export declare function submitter_pending(account: Address): PendingBoopInfo[]
