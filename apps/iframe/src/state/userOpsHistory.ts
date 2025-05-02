import { createBigIntStorage } from "@happy.tech/common"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { Address, Hash } from "viem"
import type { UserOperationReceipt } from "viem/account-abstraction"
import { StorageKey } from "../services/storage"
import { userAtom } from "./user"

export enum UserOpStatus {
    Pending = "pending",
    Success = "success",
    Failure = "failure",
}

export type UserOpInfo = {
    userOpHash: Hash
    value: bigint
    userOpReceipt?: UserOperationReceipt
    status: UserOpStatus
}

/**
 * List of all user ops that are pending, successful, or failed.
 */
const userOpsRecordAtom = atomWithStorage<Record<Address, UserOpInfo[]>>(
    StorageKey.UserOps,
    {},
    createBigIntStorage(),
    { getOnInit: true },
)

export const userOpsAtom = atom<UserOpInfo[]>((get) => {
    const user = get(userAtom)
    return user ? (get(userOpsRecordAtom)[user?.address] ?? []) : []
})
