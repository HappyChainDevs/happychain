import { randomBytes } from "node:crypto"
import { type UUID, createUUID } from "@happychain/common"
import {
    WalletType,
    type EIP1193RequestParameters,
    type HappyUser,
    type ProviderEventPayload,
} from "@happychain/sdk-shared"
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

export function generateTestUser(): HappyUser {
    const address = addressFactory()
    return {
        // connection type
        type: WalletType.Injected,
        provider: "tech.happy",
        // social details
        uid: address,
        email: "fake@example.com",
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        ens: "",
        avatar: `https://avatar.vercel.sh/${address}?size=400`,
        // web3 details
        address: address,
        addresses: [address],
    }
}
