import { hexToBytes, keccak256 } from "viem"
import type { Block, Hex } from "viem"
import { deployment } from "#lib/env"
import { BOOP_STARTED_SELECTOR, BOOP_SUBMITTED_SELECTOR } from "../services/ReceiptService"

const BLOOM_SIZE_BYTES = 256 // fixed in protocol
const ZERO_BLOOM = ("0x" + "0".repeat(512)) as Hex

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
    return (
        isInBloom(bloom, ENTRY_POINT) &&
        isInBloom(bloom, BOOP_STARTED_SELECTOR) &&
        isInBloom(bloom, BOOP_SUBMITTED_SELECTOR)
    )
}
