import type { RecordAbiPayload } from "@happychain/sdk-shared"
import { getDefaultStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { Abi, Address } from "viem"
import { StorageKey } from "#src/services/storage"

type AbiStorageRecord = Record<Address, Abi>
type AbisRecordedForUser = Record<Address, AbiStorageRecord[]>

/**
 * Atom to record contract address <-> ABI pairs, scoped by user.
 */
const abiContractMappingAtom = atomWithStorage<AbisRecordedForUser>(StorageKey.RecordedAbis, {}, undefined, {
    getOnInit: true,
})

const store = getDefaultStore()

// === State Accessors ==================================================================================

export function getWatchedAssets(): AbisRecordedForUser {
    return store.get(abiContractMappingAtom)
}

// === State Mutators ===================================================================================

/**
 * Adds a new contract <-> ABI mapping scoped by user.
 * Allows for overwriting if an ABI already exists under an
 * address (eg. proxies).
 */
export function addAbi(userAddress: Address, payload?: RecordAbiPayload): boolean {
    if (!payload) return false

    store.set(abiContractMappingAtom, (prevAbis) => {
        const recordedAbisForUser = prevAbis[userAddress] || []

        const updatedAbisForUser = [
            ...recordedAbisForUser.filter((record) => !record[payload.address]),
            { [payload.address]: payload.abi },
        ]

        return {
            ...prevAbis,
            [userAddress]: updatedAbisForUser,
        }
    })

    return true
}
