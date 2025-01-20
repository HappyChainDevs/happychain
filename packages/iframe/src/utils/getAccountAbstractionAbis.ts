import { type StaticAbis, abis as _abis } from "@happychain/contracts/account-abstraction/sepolia"
import { chains } from "@happychain/sdk-shared"

export function getAccountAbstractionAbis(chainId: string) {
    let abis = {}

    switch (chainId) {
        case chains.happyChainSepolia.chainId:
            abis = _abis
            break
        default:
            abis = _abis
    }

    return abis as StaticAbis
}
