import { type Address, HappyMap, Mutex, tryCatchAsync } from "@happy.tech/common"
import type { GetTransactionCountErrorType } from "viem"
import { logger } from "#lib/utils/logger"
import { publicClient } from "./clients"

type _Import = GetTransactionCountErrorType

export class EvmNonceManager {
    #nonces = new HappyMap<Address, number>()
    #mutexes = new HappyMap<Address, Mutex>()

    private constructor() {}
    static instance = new EvmNonceManager()

    /**
     * Gets the local view of the EOA address nonce, fetching it from the chain if it's not already available, then
     * increments the local view.
     *
     * @throws GetTransactionCountErrorType if failing to fetch the nonce onchain
     */
    async consume(address: Address): Promise<number> {
        const mutex = this.#mutexes.getOrSet(address, new Mutex())
        return await mutex.locked(async () => {
            let nonce = this.#nonces.get(address)
            if (!nonce)
                nonce = await this.#nonces.getOrSetAsync(address, async () =>
                    publicClient.getTransactionCount({ address }),
                )
            this.#nonces.set(address, nonce + 1)
            return nonce
        })
    }

    /**
     * Resync the nonce for the given EVM EOA managed by the submitter, but only if it's lower than the local view of
     * the nonce. Call this when encoutering "nonce too low" errors.
     *
     * Return the nonce fetched onchain, or undefined if could not fetch.
     *
     * This never throws.
     */
    async resyncIfTooLow(address: Address): Promise<number | undefined> {
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
        return onchainNonce
    }
}
