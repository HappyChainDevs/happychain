import type { Abi } from "viem"

/**
 * This is an internal module responsible for storing contracts' ABIs and retrieving them using contract aliases.
 * The user can't modify the alias-to-ABI bindings: those are provided in the `abis` field of the object passed to the {@link TransactionManager} constructor.
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
