import { type Hex, type UUID, createUUID } from "@happy.tech/common"
import { AuthState, EIP1193DisconnectedError, EIP1193UnauthorizedError } from "@happy.tech/wallet-common"
import type { Hash } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { type AccountWalletClient, getWalletClient } from "#src/state/walletClient"
import { getAuthState } from "../state/authState"
import { type AppURL, getAppURL, getIframeURL, isIframe } from "../utils/appURL"

/** ID passed to the iframe by the parent window (app). */
const _parentID = new URLSearchParams(window.location.search).get("windowId")

if (!isIframe(getAppURL()) && !_parentID && process.env.NODE_ENV !== "test") {
    console.warn("Iframe initialized without windowId")
}

/** ID generated for this iframe (tied to a specific app). */
const _iframeID = createUUID()

/** ID generated for this iframe (tied to a specific app). */
// Expose as a function so that the function can be mocked.
export function iframeID(): UUID {
    return _iframeID
}

/**
 * Returns the app URL for the source ID, or undefined if the source ID is not allowed (i.e. neither
 * the iframe nor its parent).
 */
export function appForSourceID(sourceId: UUID): AppURL | undefined {
    if (sourceId === _parentID) return getAppURL()
    if (sourceId === _iframeID) return getIframeURL()
    return undefined
}

/**
 * Check if the user is authenticated with the social login provider, otherwise throws an error.
 * @throws {EIP1193UnauthorizedError}
 */
export function checkAuthenticated() {
    if (getAuthState() !== AuthState.Connected) {
        throw new EIP1193UnauthorizedError()
    }
}

/**
 * Returns a `personal_sign` signing function that uses a wallet client (EOA) to sign.
 */
export async function eoaSigner(data: Hex): Promise<Hex> {
    const walletClient = getWalletClient()
    if (!walletClient) throw new EIP1193DisconnectedError()
    return await walletClient.signMessage({
        account: walletClient.account.address,
        message: { raw: data },
    })
}

/**
 * Returns a `personal_sign` signing function that uses a session key to sign.
 */
export function sessionKeySigner(sessionKey: Hex): (data: Hex) => Promise<Hex> {
    return async (boopHash: Hash) => {
        const account = privateKeyToAccount(sessionKey)
        return await account.signMessage({
            message: { raw: boopHash },
        })
    }
}
