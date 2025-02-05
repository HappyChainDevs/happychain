import { type StaticAbis, abis as _abis } from "@happy.tech/contracts/account-abstraction/sepolia"
import { happyChainSepoliaViemChain } from "@happy.tech/wallet-common"

export function getAccountAbstractionAbis(chainId: string) {
    let abis = {}

    switch (chainId) {
        case happyChainSepoliaViemChain.id.toString():
            abis = _abis
            break
        default:
            abis = _abis
    }

    return abis as StaticAbis
}
