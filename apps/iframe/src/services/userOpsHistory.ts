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

        const existingIndex = userOps.findIndex((op) => op.userOpHash === newOp.userOpHash)
        if (existingIndex >= 0) {
            const updatedOps = userOps.toSpliced(existingIndex, 1, newOp)

            // If this is a confirmed op with a nonce, we may need to reorder
            if (newOp.status === UserOpStatus.Success && newOp.userOpReceipt?.nonce) {
                return {
                    ...userOpsRecord,
                    [address]: reorderWithNonce(updatedOps, newOp),
                }
            }

            return {
                ...userOpsRecord,
                [address]: updatedOps,
            }
        }

        // This is a new op that doesn't exist in the list
        // If it's pending, it should go at the top
        if (newOp.status === UserOpStatus.Pending) {
            return {
                ...userOpsRecord,
                [address]: [newOp, ...userOps],
            }
        }

        // If it has a nonce and is confirmed, find the right position
        if (newOp.status === UserOpStatus.Success && newOp.userOpReceipt?.nonce) {
            return {
                ...userOpsRecord,
                [address]: insertWithNonce(userOps, newOp),
            }
        }

        // For other cases (e.g., failures without nonce), just add to the end
        return {
            ...userOpsRecord,
            [address]: [...userOps, newOp],
        }
    })
}

/**
 * Insert a new operation into the list at the correct position based on nonce ordering.
 * Uses linear scanning to find the insertion point.
 */
function insertWithNonce(userOps: UserOpInfo[], newOp: UserOpInfo): UserOpInfo[] {
    const newOpNonce = getNonceFromUserOp(newOp)
    if (newOpNonce === null) {
        // If no valid nonce, just append to the end
        return [...userOps, newOp]
    }

    // First, get past all pending operations (they should stay at the top)
    let insertIndex = 0
    while (insertIndex < userOps.length && userOps[insertIndex].status === UserOpStatus.Pending) {
        insertIndex++
    }

    // Now find where to insert among the non-pending operations
    // We want higher nonces (newer) to appear first, so we're looking for the first
    // operation with a nonce smaller than our new op's nonce
    while (insertIndex < userOps.length) {
        const opNonce = getNonceFromUserOp(userOps[insertIndex])

        // If this op has no nonce or a smaller nonce, insert before it
        if (opNonce === null || opNonce < newOpNonce) {
            break
        }

        insertIndex++
    }

    // Insert at the found position
    return [...userOps.slice(0, insertIndex), newOp, ...userOps.slice(insertIndex)]
}

/**
 * Reorders the list after an existing operation has been updated with a receipt.
 * This happens when a pending op gets confirmed and now has a nonce.
 */
function reorderWithNonce(userOps: UserOpInfo[], updatedOp: UserOpInfo): UserOpInfo[] {
    // First remove the updated op from the list
    const filteredOps = userOps.filter((op) => op.userOpHash !== updatedOp.userOpHash)

    // Then insert it at the right position
    return insertWithNonce(filteredOps, updatedOp)
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
 *
 * This helper is used since expected type for nonce from UserOp is bigint,
 * but returned value is hex.
 */
function getNonceFromUserOp(userOp: UserOpInfo): bigint | null {
    if (!userOp.userOpReceipt?.nonce) return null
    try {
        return fromHex(userOp.userOpReceipt.nonce as unknown as Hex, "bigint")
    } catch {
        return null
    }
}
