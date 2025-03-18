import { waitForCondition } from "@happy.tech/wallet-common"
import { getDefaultStore } from "jotai"
import { type Address, type Hex, fromHex, hexToNumber, stringToHex } from "viem"
import type { UserOperationReceipt } from "viem/account-abstraction"
import { getBalanceQueryKey } from "wagmi/query"
import { getCurrentChain } from "#src/state/chains"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient"
import { getUser, userAtom } from "#src/state/user"
import { type UserOpInfo, UserOpStatus, userOpsRecordAtom } from "#src/state/userOpsHistory"
import { queryClient } from "#src/tanstack-query/config"

const store = getDefaultStore()

async function monitorUserOpsOnLoad() {
    const user = store.get(userAtom)
    if (!user) return
    await waitForCondition(() => getSmartAccountClient())
    const pendingOps = store.get(userOpsRecordAtom)[user.address]?.filter((op) => op.status === UserOpStatus.Pending)
    if (!pendingOps || pendingOps.length === 0) return
    for (const userOpDetails of pendingOps) {
        void monitorPendingUserOp(user.address, userOpDetails)
    }
}

// Monitor existing pending userOps on load or whenever the user changes
if (store.get(userAtom)) void monitorUserOpsOnLoad()
store.sub(userAtom, () => void monitorUserOpsOnLoad())

/**
 * Adds the userOp info to the atom for the given user, replacing an existing userOp with the same
 * hash if one already exists.
 */
export function addUserOp(address: Address, newOp: UserOpInfo) {
    store.set(userOpsRecordAtom, (userOpsRecord: Record<Address, UserOpInfo[]>) => {
        const userOps = userOpsRecord[address] || []
        const index = userOps.findIndex((op) => op.userOpHash === newOp.userOpHash)

        // Create a new list with the updated or added operation
        let updatedOps = index < 0 ? [...userOps, newOp] : userOps.toSpliced(index, 1, newOp)

        // If this is a confirmed operation with a nonce, apply partial ordering
        if (newOp.status === UserOpStatus.Success && newOp.userOpReceipt?.nonce) {
            // Sort only confirmed operations by nonce (descending), keeping pending operations at top
            updatedOps = updatedOps.sort((a, b) => {
                // Always keep pending operations at the top
                if (a.status === UserOpStatus.Pending && b.status !== UserOpStatus.Pending) return -1
                if (a.status !== UserOpStatus.Pending && b.status === UserOpStatus.Pending) return 1

                // For confirmed operations, sort by nonce (higher/newer nonces first)
                const nonceA = getNonceFromUserOp(a)
                const nonceB = getNonceFromUserOp(b)

                if (nonceA !== null && nonceB !== null) {
                    return nonceA > nonceB ? -1 : nonceA < nonceB ? 1 : 0
                }

                // If one has a nonce and the other doesn't, prioritize the one with a nonce
                if (nonceA !== null) return -1
                if (nonceB !== null) return 1

                // Default to timestamp-based ordering (assuming newer operations were added more recently)
                return 0
            })
        }

        return {
            ...userOpsRecord,
            [address]: updatedOps,
        }
    })
}

export function addPendingUserOp(address: Address, userOpInfo: Omit<UserOpInfo, "status">, monitor = true) {
    const userOp = { ...userOpInfo, status: UserOpStatus.Pending }
    addUserOp(address, userOp)
    if (monitor) void monitorPendingUserOp(address, userOp)
}

export function markUserOpAsConfirmed(address: Address, value: bigint, receipt: UserOperationReceipt) {
    addUserOp(address, {
        userOpHash: receipt.userOpHash,
        value,
        userOpReceipt: receipt,
        status: UserOpStatus.Success,
    })
}

export function markUserOpAsFailed(address: Address, userOpInfo: Omit<UserOpInfo, "status">) {
    addUserOp(address, { ...userOpInfo, status: UserOpStatus.Failure })
}

/**
 * Monitors a UserOperation until it's included in a block.
 * Unlike regular transactions, we can't track intermediate states.
 * UserOperations are either pending in the mempool of the bundler or included in a block.
 * If the UserOperation fails or gets stuck, we'll never receive a receipt.
 *
 * @param address - Smart account address of the user
 * @param userOpInfo - The UserOperation details to monitor
 */
async function monitorPendingUserOp(address: Address, userOpInfo: UserOpInfo) {
    try {
        const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient
        const receipt = await smartAccountClient.waitForUserOperationReceipt({
            hash: userOpInfo.userOpHash,
            // TODO decrease when boops land — heuristic and can still in theory produce wrong results
            timeout: 120_000,
        })

        markUserOpAsConfirmed(address, userOpInfo.value, receipt)

        // Refetch balances for associated assets
        queryClient.invalidateQueries({
            queryKey: getBalanceQueryKey({
                address: getUser()?.address,
                chainId: hexToNumber(stringToHex(getCurrentChain().chainId)),
            }),
        })
    } catch (_) {
        markUserOpAsFailed(address, userOpInfo)
    }
}

/**
 * Safely extracts the nonce from a UserOpInfo if available.
 * Returns null if the receipt or nonce doesn't exist.
 */
export function getNonceFromUserOp(userOp: UserOpInfo): bigint | null {
    if (!userOp.userOpReceipt?.nonce) return null
    try {
        return fromHex(userOp.userOpReceipt.nonce as unknown as Hex, "bigint")
    } catch {
        return null
    }
}
