import { type StaticAbis, abis as _abis } from "@happychain/contracts/account-abstraction/sepolia"
import { happyChainSepolia } from "@happychain/sdk-shared"

export function getAccountAbstractionAbis(chainId: string) {
    let abis = {}

    switch (chainId) {
        case happyChainSepolia.id.toString():
            abis = _abis
            break
        default:
            abis = _abis
    }

    return abis as StaticAbis
}
