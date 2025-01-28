import type { Address } from "viem"
import { getNonce } from "#src/requests/userOps"

/** Maps from account to validator to nonce */
export const nonces = new Map<Address, Map<Address, bigint>>()

/**
 * Returns the next nonce for the given account and validator, using a local view of the nonce
 * if possible, and fetching the nonce from the chain otherwise.
 */
export async function getNextNonce(account: Address, validator: Address): Promise<bigint> {
    const storedNonce = nonces.get(account)?.get(validator)
    if (storedNonce) {
        nonces.get(account)!.set(validator, storedNonce + 1n)
        return storedNonce
    }

    let noncesForValidator = nonces.get(account)
    if (!noncesForValidator) {
        noncesForValidator = new Map()
        nonces.set(account, noncesForValidator)
    }

    const nonce = await getNonce(account, validator)
    nonces.get(account)!.set(validator, nonce)
    return nonce
}
