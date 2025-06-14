import { type Address, HappyMap, Mutex, tryCatchAsync } from "@happy.tech/common"
import type { GetTransactionCountErrorType } from "viem"
import { publicClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger"

type _Import = GetTransactionCountErrorType

export class EvmNonceManager {
    #nonces = new HappyMap<Address, number>()
    #mutexes = new HappyMap<Address, Mutex>()

    /**
     * Gets the local view of the EOA address nonce, fetching it from the chain if it's not already available, then
     * increments the local view.
     *
     * @throws GetTransactionCountErrorType if failing to fetch the nonce onchain
     */
    async consume(address: Address): Promise<number> {
        const nonce = this.#nonces.get(address)
        if (nonce) return nonce
        const mutex = this.#mutexes.getOrSet(address, new Mutex())
        return await mutex.locked(() =>
            this.#nonces.getOrSetAsync(address, async () => {
                console.trace() // TODO delete
                const nonce = await publicClient.getTransactionCount({ address })
                return nonce + 1
            }),
        )
    }

    /**
     * Resync the nonce for the given EVM EOA managed by the submitter, but only if it's lower than the local view of
     * the nonce. Call this when encoutering "nonce too low" errors.
     */
    async resyncIfTooLow(address: Address): Promise<void> {
        const { value: onchainNonce, error } = await tryCatchAsync(publicClient.getTransactionCount({ address }))
        if (error) {
            console.warn("Failed to fetch EOA nonce", address)
            this.#nonces.delete(address) // will attempt refetch the next time it's needed
            return
        }

        const localNonce = this.#nonces.get(address)
        if (!localNonce) {
            // This should never happen, but handle just in case.
            this.#nonces.set(address, onchainNonce)
        } else if (onchainNonce > localNonce) {
            logger.trace("Onchain EOA nonce is ahead of local nonce — skipping to it.", address, onchainNonce)
            this.#nonces.set(address, onchainNonce)
        }
    }
}
