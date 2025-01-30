import { Map2, Mutex } from "@happychain/common"
import type { Address } from "viem"
import { getNonce } from "#src/requests/userOps"

const nonces = new Map2<Address, Address, bigint>()
const nonceMutexes = new Map2<Address, Address, Mutex>()

/**
 * Returns the next nonce for the given account and validator, using a local view of the nonce
 * if possible, and fetching the nonce from the chain otherwise.
 *
 * This function sits besides a per-(validator,address) mutex, which avoids two userOps from
 * simultaneously requesting the same nonce from the chain, resulting in a nonce clash.)
 */
export async function getNextNonce(account: Address, validator: Address): Promise<bigint> {
    const mutex = nonceMutexes.getOrSet(account, validator, () => new Mutex())
    return mutex.locked(async () => {
        const nonce = await nonces.getOrSetAsync(account, validator, () => getNonce(account, validator))
        nonces.set(account, validator, nonce + 1n)
        return nonce
    })
}

/**
 * Deletes the local nonce information for a the given account and validator.
 */
export function deleteNonce(account: Address, validator: Address) {
    nonces.delete(account, validator)
}
