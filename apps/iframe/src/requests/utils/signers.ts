/**
 * Functions used for signing boops.
 */

import { getWalletClient } from "#src/state/walletClient"
import type { Hex } from "@happy.tech/common"
import { EIP1193DisconnectedError } from "@happy.tech/wallet-common"
import type { Hash } from "viem"
import { privateKeyToAccount } from "viem/accounts"

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
