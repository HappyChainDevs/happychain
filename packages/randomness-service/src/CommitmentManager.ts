import crypto from "node:crypto"
import type { Hex } from "viem"
import { toHex } from "viem"

export class CommitmentManager {
    private readonly map = new Map<bigint, Hex>()

    generateCommitment(timestamp: bigint): Hex {
        const commitment = toHex(crypto.randomBytes(32))
        this.map.set(timestamp, commitment)
        return commitment
    }

    getCommitmentForTimestamp(timestamp: bigint): Hex | undefined {
        return this.map.get(timestamp)
    }
}
