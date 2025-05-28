import { type ExecuteOutput, type ExecuteSuccess, Onchain } from "@happy.tech/boop-sdk"
import { createBigIntStorage } from "@happy.tech/common"
import type { Address, Hash } from "@happy.tech/common"
import { atom } from "jotai"
import { getDefaultStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { StorageKey } from "../services/storage"
import { userAtom } from "./user"

// Store Instantiation
const store = getDefaultStore()

/**
 * List of all boops that are pending, successful, or failed.
 */
const boopsRecordAtom = atomWithStorage<Record<Address, StoredBoop[]>>(StorageKey.Boops, {}, createBigIntStorage(), {
    getOnInit: true,
})

/**
 * Atom that returns the boops for the current user
 */
export const boopsAtom = atom(
    (get) => {
        const user = get(userAtom)
        if (!user) return []
        return get(boopsRecordAtom)[user.address] ?? []
    },
    (get, set, boops: StoredBoop[]) => {
        const user = get(userAtom)
        if (!user) return

        set(boopsRecordAtom, (stored) => {
            return {
                // Must spread here for Jotai to trigger rerender
                ...stored,
                [user.address]: boops.toSorted((a, b) => b.createdAt - a.createdAt),
            }
        })
    },
)

// === Interfaces ==============================================================================

export type ErrorType = { message: string; code?: number | string }

export enum BoopStatus {
    Pending = "pending",
    Success = "success",
    Failure = "failure",
}

interface IStoredBoop {
    boopHash: Hash
    confirmedAt?: number
    createdAt: number
    value: bigint
    error?: ErrorType
    failedAt?: number
    boopReceipt?: ExecuteOutput
    status: BoopStatus
}
export type StoredBoop = PendingBoop | ConfirmedBoop | FailedBoop
export interface PendingBoop extends IStoredBoop {
    error?: never
    boopReceipt?: never
    status: BoopStatus.Pending
}

export interface ConfirmedBoop extends IStoredBoop {
    confirmedAt: number
    error?: never
    failedAt?: never
    boopReceipt: ExecuteOutput
    status: BoopStatus.Success
}

export interface FailedBoop extends IStoredBoop {
    confirmedAt?: never
    error?: ErrorType
    failedAt: number
    boopReceipt?: never
    status: BoopStatus.Failure
}

export type BoopEntry = PendingBoop | ConfirmedBoop | FailedBoop

// === State Mutators ==============================================================================

export function addPendingBoop(boop: Omit<PendingBoop, "createdAt" | "status">): void {
    const entry = {
        boopHash: boop.boopHash,
        value: boop.value,
        createdAt: Date.now(),
        status: BoopStatus.Pending,
    } satisfies PendingBoop

    const accountBoops = store.get(boopsAtom) || []
    const existing = accountBoops.find((boop) => boop.boopHash === entry.boopHash)
    if (existing) existing.createdAt = Date.now()
    else accountBoops.push(entry)

    store.set(boopsAtom, accountBoops)
}

export function markBoopAsSuccess(receipt: ExecuteSuccess): void {
    if (receipt.status !== Onchain.Success) {
        console.error("Cannot mark boop as confirmed: Boop hash is missing.")
        return
    }
    // biome-ignore format: compact
    updateBoop(receipt.receipt.boopHash, (old) => ({
        ...old,
        status: BoopStatus.Success,
        confirmedAt: Date.now(),
        boopReceipt: receipt,
    }) as ConfirmedBoop)
}

export function markBoopAsFailure(failedBoop: Hash, error?: ErrorType): void {
    // biome-ignore format: compact
    updateBoop(failedBoop, (old) => ({
        ...old,
        status: BoopStatus.Failure,
        failedAt: Date.now(),
        error,
    }) as FailedBoop)
}

function updateBoop(boopHash: Hash, update: (_: PendingBoop) => StoredBoop): void {
    const boops = store.get(boopsAtom) ?? []
    const i = boops.findIndex((it) => it.boopHash === boopHash)
    store.set(boopsAtom, [...boops].splice(i, 1, update(boops[i] as PendingBoop)))
}
