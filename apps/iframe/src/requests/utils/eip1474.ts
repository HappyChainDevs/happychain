/**
 * EIP1474 validation utilities
 */

import { type Hex, parseBigInt } from "@happy.tech/common"
import { EIP1474InvalidInput } from "@happy.tech/wallet-common"
import type { BlockTag, RpcBlockIdentifier } from "viem"

const BLOCK_TAGS = ["pending", "earliest", "finalized", "safe", "latest"]

/**
 * Type of block parameters of EIP1474 requests.
 */
export type BlockParam = Hex | BlockTag | RpcBlockIdentifier

/**
 * Parses out a block tag or a block number from the block parameter of an EIP1474 request, so they can be passed
 * to Viem functions.
 *
 * The output will have neither only if the block is undefined, otherwise it will have exactly one, or throw. This does
 * not fully support EIP1474 block identifiers, as they are not supported by Viem — `requireCanonical` and `blockHash`
 * are unsupported.
 *
 * @throws EIP1474InvalidInput if a block is specified but malformed
 */
export function parseBlockParam(block: BlockParam | undefined): {
    blockNumber?: bigint
    blockTag?: BlockTag
} {
    if (typeof block === "string") {
        if (BLOCK_TAGS.includes(block)) return { blockTag: block as BlockTag }
        const blockNumber = parseBigInt(block)
        if (!blockNumber) throw new EIP1474InvalidInput(`invalid block number: ${block}`)
        return { blockNumber }
    }
    if (typeof block === "object") {
        if ("requireCanonical" in block || "blockHash" in block) {
            // it's unsupported by viem
            throw new EIP1474InvalidInput("requireCanonical and blockHash are unsupported RpcBlockIdentifier")
        }
        if ("blockNumber" in block) {
            const blockNumber = parseBigInt(block.blockNumber)
            if (blockNumber) return { blockNumber }
        }
        throw new EIP1474InvalidInput(`invalid RpcBlockIdentifier: ${JSON.stringify(block)}`)
    }
    return {}
}
