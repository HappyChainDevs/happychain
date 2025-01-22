import type { RecordAbiPayload } from "@happy.tech/wallet-common"
import { getDefaultStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { Abi, Address } from "viem"
import { StorageKey } from "#src/services/storage"

type AbiStorageRecord = Record<Address, Abi>
type AbisLoadedForUser = Record<Address, AbiStorageRecord>

/**
 * Atom to record contract address <-> ABI pairs, scoped by user.
 */
export const abiContractMappingAtom = atomWithStorage<AbisLoadedForUser>(StorageKey.LoadedAbis, {}, undefined, {
    getOnInit: true,
})

const store = getDefaultStore()

// === State Accessors ==================================================================================

export function getLoadedAbis(): AbisLoadedForUser {
    return store.get(abiContractMappingAtom)
}

// === State Mutators ===================================================================================

/**
 * Adds a new contract <-> ABI mapping scoped by user.
 * Allows for overwriting if an ABI already exists under an
 * address (eg. proxies).
 */
export function loadAbiForUser(userAddress: Address, payload?: RecordAbiPayload): boolean {
    if (!payload) return false

    store.set(abiContractMappingAtom, (prevAbis) => {
        const loadedAbisForUser = prevAbis[userAddress] || []

        return {
            ...prevAbis,
            [userAddress]: {
                ...loadedAbisForUser,
                [payload.address]: payload.abi,
            },
        }
    })

    return true
}
