import ContractsAAHappySepolia from "@happychain/contracts/AccountAbstractionHappySepolia"
import { chains } from "@happychain/sdk-shared"

type AccountAbstractionContracts = keyof typeof ContractsAAHappySepolia

export function getAccountAbstractionContracts(chainId: string): Record<AccountAbstractionContracts, `0x${string}`> {
    let contracts = {}
    switch (chainId) {
        case chains.happyChainSepolia.chainId:
            contracts = ContractsAAHappySepolia
            break
        default:
            contracts = ContractsAAHappySepolia
            break
    }

    return contracts as Record<AccountAbstractionContracts, `0x${string}`>
}
