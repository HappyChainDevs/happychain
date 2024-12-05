import type { recordAbiPayload } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { Abi, Address } from "viem"
import { StorageKey } from "#src/services/storage"

type AbiStorageRecord = Record<Address, Abi>

/**
 * Atom to record contract address <-> ABI pairs.
 */
const abiContractMappingAtom = atomWithStorage<AbiStorageRecord>(StorageKey.RecordedAbis, {}, undefined, {
    getOnInit: true,
})

// Store Instantiation
const store = getDefaultStore()

// === State Accessors ==================================================================================

export function getWatchedAssets(): AbiStorageRecord {
    return store.get(abiContractMappingAtom)
}

// === State Mutators ===================================================================================

export function addAbi(payload?: recordAbiPayload): boolean {
    let alreadyRecorded = false
    if (!payload) return alreadyRecorded

    store.set(abiContractMappingAtom, (prevAbis) => {
        if (prevAbis[payload.address]) {
            alreadyRecorded = true
            return prevAbis
        }

        return {
            ...prevAbis,
            [payload.address]: payload.abi,
        }
    })

    return !alreadyRecorded
}
