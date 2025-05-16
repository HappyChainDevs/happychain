/**
 * Methods to forward EIP1193 RPC request to various Viem clients after making safety checks.
 */

import type { EIP1193RequestParameters, EIP1193RequestResult } from "@happy.tech/wallet-common"
import type { Client } from "viem"
import { ensureIsNotHappyMethod, ensureRequestIsPermissionless } from "#src/requests/utils/checks"
import { getPublicClient } from "#src/state/publicClient"
import { getWalletClient } from "#src/state/walletClient"
import type { AppURL } from "#src/utils/appURL"

export async function sendToPublicClient<T extends EIP1193RequestParameters>(
    app: AppURL,
    requestParams: T,
): Promise<EIP1193RequestResult<T["method"]>> {
    ensureRequestIsPermissionless(app, requestParams)
    ensureIsNotHappyMethod(requestParams)
    return await (getPublicClient() as Client).request(requestParams)
}

export async function sendToWalletClient<T extends EIP1193RequestParameters>(
    requestParams: T,
): Promise<EIP1193RequestResult<T["method"]>> {
    ensureIsNotHappyMethod(requestParams)
    return await getWalletClient().request(requestParams)
}
