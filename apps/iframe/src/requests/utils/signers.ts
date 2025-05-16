/**
 * Functions used for signing boops.
 */

import type { Hash, Hex } from "@happy.tech/common"
import { privateKeyToAccount } from "viem/accounts"
import { getWalletClient } from "#src/state/walletClient"

/**
 * Returns a `personal_sign` signing function that uses a wallet client (EOA) to sign.
 */
export async function eoaSigner(data: Hex): Promise<Hex> {
    const walletClient = getWalletClient()
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
