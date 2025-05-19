import { deployment } from "@happy.tech/contracts/boop/sepolia"
import { hexToBytes, keccak256 } from "viem"
import type { Block, Hex } from "viem"

const BLOOM_SIZE_BYTES = 256 // fixed in protocol
const ZERO_BLOOM = ("0x" + "0".repeat(512)) as Hex

//todo: calc these
const STARTED_SIG = "0x7919742665278276d4d5e9b0b8d8ed9eb969973cffb8bf4700ff39df91ac1ab1"
const SUBMITTED_SIG = "0x2679a4611431daccdaea2c844ea9ba2f7427ac1ecb51d07d7ecd746a9e7a8050"

const ENTRY_POINT = deployment.EntryPoint.toLowerCase() as Hex

/**
 * Return `true` iff the three bits derived from `input` are all set in `bloom`.
 * False‑positives are possible; false‑negatives are not.
 */
const isInBloom = (bloom: Hex, input: Hex): boolean => {
    const bloomBytes = hexToBytes(bloom)
    const hash = hexToBytes(keccak256(input)) // 32‑byte Keccak

    for (const i of [0, 2, 4]) {
        // pick 3 × 11‑bit buckets
        const bit = (hash[i + 1]! + (hash[i]! << 8)) & 0x07ff // 0‑2047
        const byte = BLOOM_SIZE_BYTES - 1 - (bit >> 3)
        const mask = 1 << (bit & 7)
        if ((bloomBytes[byte]! & mask) === 0) return false
    }
    return true
}

export function headerCouldContainBoop(block: Block): boolean {
    const bloom = block.logsBloom
    if (!bloom || bloom === ZERO_BLOOM) return false

    // all three conditions must be *possible* in the bloom
    //   console.log("isInBloom--entrypoint", isInBloom(bloom, ENTRY_POINT))
    //   console.log("isInBloom--startedSig", isInBloom(bloom, STARTED_SIG))
    //   console.log("isInBloom--submittedSig", isInBloom(bloom, SUBMITTED_SIG))
    return isInBloom(bloom, ENTRY_POINT) && isInBloom(bloom, STARTED_SIG) && isInBloom(bloom, SUBMITTED_SIG)
}
