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

        return {
            ...existingEntries,
            [address]: [userOpInfo, ...userHistory],
        }
    })
}

export function addPendingUserOp(address: Address, payload: PendingUserOpDetails) {
    store.set(pendingUserOpsAtom, (existingEntries) => {
        const pendingUserOps = existingEntries[address] || []
        const isAlreadyPending = pendingUserOps.some((op) => op.userOpHash === payload.userOpHash)

        if (isAlreadyPending) {
            console.warn(`Already tracking UserOperation ${payload.userOpHash}`)

            return existingEntries
        }

        void monitorUserOp(address, payload)
        return {
            ...existingEntries,
            [address]: [payload, { ...pendingUserOps, status: "pending" }],
        }
    })
}

export function flagUserOpAsFailed(address: Address, payload: PendingUserOpDetails) {
    store.set(pendingUserOpsAtom, (existingEntries) => {
        const pendingUserOps = existingEntries[address] || []
        return {
            ...existingEntries,
            [address]: pendingUserOps.map((op) =>
                op.userOpHash === payload.userOpHash ? { ...op, status: "failed" } : op,
            ),
        }
    })
}

export function removeUserOp(address: Address, payload: PendingUserOpDetails) {
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
async function monitorUserOp(address: Address, payload: PendingUserOpDetails) {
    try {
        const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient
        const receipt = await smartAccountClient.waitForUserOperationReceipt({
            hash: payload.userOpHash,
        })

        if (receipt) {
            removeUserOp(address, payload)
            addConfirmedUserOp(address, {
                receipt,
                value: payload.value,
            })
            // Because of this, we can refetch the balances for associated assets.
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
