import { randomBytes } from "node:crypto"
import { type UUID, createUUID } from "@happy.tech/common"
import {
    type ApprovedRequestPayload,
    type EIP1193RequestParameters,
    type HappyUser,
    type ProviderEventPayload,
    WalletType,
} from "@happy.tech/wallet-common"
import { getAddress } from "viem"

/**
 * Generates EVM address for testing purposes only
 */
export const addressFactory = () => getAddress(`0x${randomBytes(20).toString("hex")}`)

/**
 * Creates a formatted ProviderEventPayload
 */
export function makePayload<T extends EIP1193RequestParameters | ApprovedRequestPayload>(
    windowId: UUID,
    payload: T,
): ProviderEventPayload<T> {
    return {
        key: createUUID(),
        windowId,
        error: null,
        payload,
    }
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
        avatar: `https://avatar.vercel.sh/${address}?size=120`,
        // web3 details
        address: address,
        controllingAddress: address,
    }
}
