import type { Address } from "@happy.tech/common"
import { abis as mockAbis, deployment as mockDeployments } from "@happy.tech/contracts/mocks/anvil"
import { parseEther } from "viem/utils"
import { findExecutionAccount } from "#lib/services/evmAccounts"
import { publicClient, walletClient } from "#lib/utils/clients"

export { mockDeployments, mockAbis }
export { client, createSmartAccount } from "./client"

/**
 * Fund the given account with 1 Ether.
 * Exported from the index to avoid pulling business logic into helpers.ts, so that we can use it for scripts, etc.
 */
export async function fundAccount(address: Address) {
    const executor = findExecutionAccount(/* Default Execution Account */)
    const hash = await walletClient.sendTransaction({ account: executor, to: address, value: parseEther("1") })
    await publicClient.waitForTransactionReceipt({ hash })
}

export * from "./helpers"
