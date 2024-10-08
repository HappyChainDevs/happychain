import { randomBytes } from "node:crypto"
import { type UUID, createUUID } from "@happychain/common"
import type { EIP1193RequestParameters, ProviderEventPayload } from "@happychain/sdk-shared"
import { getAddress } from "viem"

/**
 * Generates EVM address for testing purposes only
 */
export const addressFactory = () => getAddress(`0x${randomBytes(20).toString("hex")}`)

/**
 * Creates a formatted ProviderEventPayload
 */
export function makePayload(windowId: UUID, payload: EIP1193RequestParameters) {
    return {
        key: createUUID(),
        windowId,
        error: null,
        payload,
    } as ProviderEventPayload<EIP1193RequestParameters>
}
