import type { Abi } from "viem"

/**
 * This is an internal module responsible for storing ABI contracts and retrieving them using contract aliases.
 * The user doesn't have access to overwrite this module, but they must provide a record of aliases to ABIs when creating a transaction manager.
 * The field to provide the Alias to ABIs record is called abis.
 */
export class ABIManager {
    public store: Record<string, Abi | undefined>

    constructor(initialAbis: Record<string, Abi | undefined>) {
        this.store = { ...initialAbis }
    }

    public get(alias: string) {
        return this.store[alias]
    }

    public set(alias: string, abi: Abi) {
        this.store[alias] = abi
    }
}
