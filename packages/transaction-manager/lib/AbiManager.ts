import type { Abi } from "viem"

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
