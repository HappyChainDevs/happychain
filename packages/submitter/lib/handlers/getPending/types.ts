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
