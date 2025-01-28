import { type Address, toHex } from "viem"
import { getNonce } from "#src/requests/userOps"

/** Maps from account to validator to nonce */
export const nonces = new Map<Address, Map<Address, bigint>>()

export function setNonce(account: Address, validator: Address, nonce: bigint) {
    let noncesForValidator = nonces.get(account)
    if (!noncesForValidator) {
        noncesForValidator = new Map()
        nonces.set(account, noncesForValidator)
    }
    noncesForValidator.set(validator, nonce)
}

export function deleteNonce(account: Address, validator: Address) {
    const noncesForValidator = nonces.get(account)
    noncesForValidator?.delete(validator)
    if (noncesForValidator?.size === 0) {
        nonces.delete(account)
    }
}

/**
 * Returns the next nonce for the given account and validator, using a local view of the nonce
 * if possible, and fetching the nonce from the chain otherwise.
 */
export async function getNextNonce(account: Address, validator: Address): Promise<bigint> {
    const storedNonce = nonces.get(account)?.get(validator)
    if (storedNonce) {
        setNonce(account, validator, storedNonce + 1n)
        return storedNonce
    }

    const nonce = await getNonce(account, validator)
    setNonce(account, validator, nonce + 1n)
    return nonce
}
