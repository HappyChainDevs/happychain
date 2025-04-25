import { type BoopState, EntryPointStatus, type ExecuteOutput } from "@happy.tech/boop-sdk"
import type { Address, Hash } from "viem"
import { StorageKey, storage } from "./storage"

export interface PendingBoop {
    boopHash: Hash
    // value: bigint
    createdAt: number
    status: "submitted" | "confirmed" | "failed"
}

export interface ConfirmedBoop extends PendingBoop {
    status: "confirmed"
    receipt: ExecuteOutput
    confirmedAt: number
}

export interface FailedBoop extends PendingBoop {
    status: "failed"
    error?: {
        message: string
        code?: number | string
    }
    failedAt: number
}

export type BoopEntry = PendingBoop | ConfirmedBoop | FailedBoop

export function addPendingBoop(account: Address, boopHash: Hash): void {
    const entry: PendingBoop = {
        boopHash,
        createdAt: Date.now(),
        status: "submitted",
    }
    const savedBoops = unserializeBigInt(storage.get(StorageKey.Boops) || {})
    const accountBoops = savedBoops[account] || []
    // @ts-ignore
    savedBoops[account] = [...accountBoops, entry]
    try {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        storage.set(StorageKey.Boops, serializeBigInt(savedBoops as any))
    } catch (err) {
        console.log({ err })
    }
}

export function markBoopAsConfirmed(account: Address, receipt: BoopState["receipt"]): void {
    if (receipt?.status !== EntryPointStatus.Success) {
        console.error("Cannot mark boop as confirmed: Boop hash is missing.")
        return
    }
    console.log({ receipt })
    updateBoopStatus(account, receipt.boopHash, {
        status: "confirmed",
        receipt,
        confirmedAt: Date.now(),
    })
}

export function markBoopAsFailed(
    account: Address,
    boopHash: Hash,
    error?: {
        message: string
        code?: number | string
    },
): void {
    updateBoopStatus(account, boopHash, {
        status: "failed",
        failedAt: Date.now(),
        error,
    })
}

function updateBoopStatus(account: Address, boopHash: Hash, update: Partial<BoopEntry>): void {
    const savedBoops = unserializeBigInt(storage.get(StorageKey.Boops) || {})
    const accountBoops = savedBoops[account] || []
    // @ts-ignore
    const updatedBoops = accountBoops.map((boop: BoopEntry) => {
        if (boop.boopHash === boopHash) {
            return { ...boop, ...update }
        }
        return boop
    })

    // @ts-ignore
    savedBoops[account] = updatedBoops
    // @ts-ignore
    storage.set(StorageKey.Boops, serializeBigInt(savedBoops))
}

// TODO: correct formatting and fix types

// Utility type to transform all bigint fields to string
type ReplaceBigIntWithString<T> = {
    [K in keyof T]: T[K] extends bigint ? string : T[K] extends object ? ReplaceBigIntWithString<T[K]> : T[K]
}

// Utility functions to serialize and deserialize bigint values
function serializeBigInt<T>(obj: T): ReplaceBigIntWithString<T> {
    if (typeof obj === "bigint") {
        return obj.toString() as ReplaceBigIntWithString<T>
    } else if (Array.isArray(obj)) {
        return obj.map((item) => serializeBigInt(item)) as unknown as ReplaceBigIntWithString<T>
    } else if (obj !== null && typeof obj === "object") {
        const serializedObj = {} as Record<string, unknown>
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                serializedObj[key] = serializeBigInt((obj as T)[key])
            }
        }
        return serializedObj as ReplaceBigIntWithString<T>
    }
    return obj as ReplaceBigIntWithString<T>
}
type ReplaceStringWithBigInt<T> = {
    [K in keyof T]: T[K] extends bigint ? string : T[K] extends object ? ReplaceStringWithBigInt<T[K]> : T[K]
}

function unserializeBigInt<T>(obj: T): ReplaceStringWithBigInt<T> {
    if (typeof obj === "string" && obj.startsWith("#bigint.")) {
        return BigInt(obj.replace(/^#bigint\./, "")) as ReplaceStringWithBigInt<T>
    } else if (Array.isArray(obj)) {
        return obj.map((item) => unserializeBigInt(item)) as unknown as ReplaceStringWithBigInt<T>
    } else if (obj !== null && typeof obj === "object") {
        const serializedObj = {} as Record<string, unknown>
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                serializedObj[key] = unserializeBigInt((obj as T)[key])
            }
        }
        return serializedObj as ReplaceStringWithBigInt<T>
    }
    return obj as ReplaceStringWithBigInt<T>
}
