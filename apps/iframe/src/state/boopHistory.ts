import { type BoopReceipt, Onchain } from "@happy.tech/boop-sdk"
import { binaryPartition, createBigIntStorage } from "@happy.tech/common"
import { atom } from "jotai"
import { getDefaultStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { Address, Hash } from "viem"
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
    error?: { message: string; code?: number | string }
    failedAt?: number
    boopReceipt?: BoopReceipt
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
    boopReceipt: BoopReceipt
    status: BoopStatus.Success
}

export interface FailedBoop extends IStoredBoop {
    confirmedAt?: never
    error?: { message: string; code?: number | string }
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

export function markBoopAsSuccess(receipt: BoopReceipt): void {
    if (receipt.status !== Onchain.Success) {
        console.error("Cannot mark boop as confirmed: Boop hash is missing.")
        return
    }

    updateBoopStatus(receipt.boopHash, {
        status: BoopStatus.Success,
        confirmedAt: Date.now(),
        boopReceipt: receipt,
    } satisfies Omit<ConfirmedBoop, "boopHash" | "createdAt" | "value">)
}

export function markBoopAsFailure(
    boopHash: Hash,
    error?: {
        message: string
        code?: number | string
    },
): void {
    updateBoopStatus(boopHash, {
        status: BoopStatus.Failure,
        failedAt: Date.now(),
        error,
    } satisfies Omit<FailedBoop, "boopHash" | "createdAt" | "value">)
}

function updateBoopStatus(boopHash: Hash, update: Partial<StoredBoop>): void {
    const [[existing], rest] = binaryPartition(
        store.get(boopsAtom) ?? [], //
        (boop) => boop.boopHash === boopHash,
    )
    if (!existing) {
        console.warn("Boop not found in history, cannot update status", { boopHash, update })
        return
    }
    const updated = { ...existing, ...update } as StoredBoop
    store.set(boopsAtom, [...rest, updated])
}
