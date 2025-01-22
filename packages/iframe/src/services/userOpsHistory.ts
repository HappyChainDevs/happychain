import { getDefaultStore } from "jotai"
import { type Address, hexToNumber, stringToHex } from "viem"
import { getBalanceQueryKey } from "wagmi/query"
import { getCurrentChain } from "#src/state/chains"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient"
import { getUser } from "#src/state/user"
import {
    type PendingUserOpDetails,
    type UserOpInfo,
    confirmedUserOpsAtom,
    pendingUserOpsAtom,
} from "#src/state/userOpsHistory"
import { queryClient } from "#src/tanstack-query/config"

const store = getDefaultStore()

export function addConfirmedUserOp(address: Address, userOpInfo: UserOpInfo) {
    store.set(confirmedUserOpsAtom, (existingEntries) => {
        const userHistory = existingEntries[address] || []
        const isReceiptAlreadyLogged = userHistory.some((op) => op.receipt.userOpHash === userOpInfo.receipt.userOpHash)

        if (isReceiptAlreadyLogged) {
            console.warn("UserOperation already confirmed — this should never happen")
            return existingEntries
        }

        console.log("confirmed op:", userOpInfo)

        return {
            ...existingEntries,
            [address]: [userOpInfo, ...userHistory],
        }
    })
}

export function addPendingUserOp(address: Address, payload: Omit<PendingUserOpDetails, "status">) {
    store.set(pendingUserOpsAtom, (existingEntries) => {
        const pendingUserOps = existingEntries[address] || []
        const isAlreadyPending = pendingUserOps.some((op) => op.userOpHash === payload.userOpHash)

        if (isAlreadyPending) {
            console.warn(`Already tracking UserOperation ${payload.userOpHash}`)
            return existingEntries
        }

        void monitorPendingUserOp(address, { ...payload, status: "pending" })
        return {
            ...existingEntries,
            [address]: [{ ...payload, status: "pending" }, ...pendingUserOps],
        }
    })
}

export function flagUserOpAsFailed(address: Address, payload: PendingUserOpDetails) {
    store.set(pendingUserOpsAtom, (existingEntries) => {
        const pendingUserOps = existingEntries[address] || []
        const updatedOps = pendingUserOps.map((op) =>
            op.userOpHash === payload.userOpHash ? { ...op, status: "failed" as const } : op,
        )

        // If this was the only operation for this address, clean up the entry
        if (updatedOps.every((op) => op.status === "failed")) {
            const { [address]: _, ...remainingEntries } = existingEntries
            return remainingEntries
        }

        return {
            ...existingEntries,
            [address]: updatedOps,
        }
    })
}
export function removePendingUserOp(address: Address, payload: PendingUserOpDetails) {
    store.set(pendingUserOpsAtom, (existingEntries) => {
        const updatedOps = (existingEntries[address] || []).filter((op) => op.userOpHash !== payload.userOpHash)

        if (updatedOps.length === 0) {
            const { [address]: _, ...remainingEntries } = existingEntries
            return remainingEntries
        }

        return {
            ...existingEntries,
            [address]: updatedOps,
        }
    })
}

/**
 * Monitors a UserOperation until it's included in a block.
 * Unlike regular transactions, we can't track intermediate states.
 * UserOperations are either pending in the mempool of the bundler or included in a block.
 * If the UserOperation fails or gets stuck, we'll never receive a receipt.
 *
 * @param address - Smart account address of the user
 * @param payload - The UserOperation details to monitor
 */
async function monitorPendingUserOp(address: Address, payload: PendingUserOpDetails) {
    try {
        const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient
        const receipt = await smartAccountClient.waitForUserOperationReceipt({
            hash: payload.userOpHash,
        })

        if (receipt) {
            console.log("pending -> confirmed:", receipt)
            removePendingUserOp(address, payload)
            addConfirmedUserOp(address, {
                receipt,
                value: payload.value,
            })
            // Refetch balances for associated assets
            queryClient.invalidateQueries({
                queryKey: getBalanceQueryKey({
                    address: getUser()?.address,
                    chainId: hexToNumber(stringToHex(getCurrentChain().chainId)),
                }),
            })
        }
    } catch (error) {
        console.warn(`UserOperation failed: ${payload.userOpHash}`, error)
        flagUserOpAsFailed(address, payload)
    }
}
