import { createBigIntStorage } from "@happy.tech/common"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { Address, Hash } from "viem"
import { StorageKey } from "../services/storage"
import { userAtom } from "./user"

// @todo - edit imports
import type { ExecuteOutput } from "../../../../packages/submitter/lib/tmp/interface/submitter_execute"

export enum BoopStatus {
    Pending = "pending",
    Success = "success",
    Failure = "failure",
}

export type BoopInfo = {
    boopHash: Hash
    value: bigint
    boopReceipt?: ExecuteOutput
    status: BoopStatus
}

/**
 * List of all boops that are pending, successful, or failed.
 */
export const boopsRecordAtom = atomWithStorage<Record<Address, BoopInfo[]>>(
    StorageKey.Boops,
    {},
    createBigIntStorage(),
    { getOnInit: true },
)

/**
 * Atom that returns the boops for the current user
 */
export const boopsAtom = atom<BoopInfo[]>((get) => {
    const user = get(userAtom)
    return user ? (get(boopsRecordAtom)[user?.address] ?? []) : []
})
