import { deployment as contractsAddresses } from "@happychain/contracts/sepolia"
import { chains } from "@happychain/sdk-shared"

type AccountAbstractionContracts = keyof typeof contractsAddresses

export function getAccountAbstractionContracts(chainId: string): Record<AccountAbstractionContracts, `0x${string}`> {
    let contracts = {}
    switch (chainId) {
        case chains.happyChainSepolia.chainId:
            contracts = contractsAddresses
            break
        default:
            contracts = contractsAddresses
            break
    }

    return contracts as Record<AccountAbstractionContracts, `0x${string}`>
}
