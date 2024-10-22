import crypto from "node:crypto"
import type { Hex } from "viem"
import { encodePacked, keccak256 } from "viem"

interface Commitment {
    value: bigint
    commitment: Hex
}

export class CommitmentManager {
    private readonly map = new Map<bigint, Commitment>()

    generateCommitmentForTimestamp(timestamp: bigint): Commitment {
        const value = this.generateRandomness()
        const commitment = this.hashValue(value)
        const commitmentObject = { value, commitment }
        this.map.set(timestamp, commitmentObject)
        return commitmentObject
    }

    getCommitmentForTimestamp(timestamp: bigint): Commitment | undefined {
        return this.map.get(timestamp)
    }

    private generateRandomness(): bigint {
        const bytes = crypto.randomBytes(32)
        let hex = "0x"

        for (const byte of bytes) {
            hex += byte.toString(16).padStart(2, "0")
        }

        return BigInt(hex)
    }

    private hashValue(value: bigint): Hex {
        return keccak256(encodePacked(["uint256"], [value]))
    }
}
