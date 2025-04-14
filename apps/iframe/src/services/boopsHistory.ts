import type { Address, Hash } from "viem"
import { type BoopEntry, type PendingBoop, StorageKey, storage } from "./storage"
import type { ExecuteOutput } from "@happy.tech/submitter-client"

export function addPendingBoop(account: Address, pendingBoop: Omit<PendingBoop, "createdAt" | "status">): void {
    const entry: PendingBoop = {
        ...pendingBoop,
        createdAt: Date.now(),
        status: "submitted",
    }

    const savedBoops = storage.get(StorageKey.Boops) || {}
    const accountBoops = savedBoops[account] || []
    savedBoops[account] = [...accountBoops, entry]
    storage.set(StorageKey.Boops, savedBoops)
}

export function markBoopAsConfirmed(account: Address, value: bigint, receipt: ExecuteOutput): void {
    if (receipt.status !== "submitSuccess") {
        console.error("Cannot mark boop as confirmed: Boop hash is missing.")
        return
    }

    updateBoopStatus(account, receipt.state.receipt?.happyTxHash!, {
        status: "confirmed",
        receipt,
        value,
        confirmedAt: Date.now(),
    })
}

export function markBoopAsFailed(
    account: Address,
    failedBoop: Omit<PendingBoop, "createdAt" | "status">,
    error?: {
        message: string
        code?: number | string
    },
): void {
    updateBoopStatus(account, failedBoop.boopHash, {
        status: "failed",
        value: failedBoop.value,
        failedAt: Date.now(),
        error,
    })
}

function updateBoopStatus(account: Address, boopHash: Hash, update: Partial<BoopEntry>): void {
    const savedBoops = storage.get(StorageKey.Boops) || {}
    const accountBoops = savedBoops[account] || []
    const updatedBoops = accountBoops.map((boop: BoopEntry) => {
        if (boop.boopHash === boopHash) {
            return { ...boop, ...update }
        }
        return boop
    })

    savedBoops[account] = updatedBoops
    storage.set(StorageKey.Boops, savedBoops)
}
