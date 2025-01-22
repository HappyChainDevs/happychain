import { createBigIntStorage } from "@happy.tech/common"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { Address, Hash } from "viem"
import type { UserOperationReceipt } from "viem/account-abstraction"
import { StorageKey } from "../services/storage"
import { userAtom } from "./user"

export type PendingUserOpDetails = {
    userOpHash: Hash
    value: bigint
    status: "pending" | "failed"
}

export type UserOpInfo = {
    userOpReceipt: UserOperationReceipt
    value: bigint
}

/**
 * Tracks UserOperations from the moment they're sent to the bundler
 * until they're included in a transaction or fail.
 * Unlike regular transactions, UserOps don't have intermediate states.
 * As such, we can track only track if they are :
 * - Pending in the mempool of the bundler
 * - Included in a transaction
 * - Failed (never included by the bundler)
 */
export const pendingUserOpsAtom = atomWithStorage<Record<Address, PendingUserOpDetails[]>>(
    StorageKey.PendingUserOps,
    {},
    createBigIntStorage<Record<Address, PendingUserOpDetails[]>>(),
    { getOnInit: true },
)

/**
 *
 * UserOps that have been successfully included in a transaction.
 * By the time an operation appears here, the transaction is already processed.
 */
export const confirmedUserOpsAtom = atomWithStorage<Record<Address, UserOpInfo[]>>(
    StorageKey.ConfirmedUserOps,
    {},
    createBigIntStorage(),
)

export const userOpsAtom = atom((get) => {
    const user = get(userAtom)
    const confirmed = get(confirmedUserOpsAtom)
    const pending = get(pendingUserOpsAtom)

    if (!user) return { pendingOps: [], confirmedOps: [] }

    return {
        pendingOps: pending[user.address] ?? [],
        confirmedOps: confirmed[user.address] ?? [],
    }
})
