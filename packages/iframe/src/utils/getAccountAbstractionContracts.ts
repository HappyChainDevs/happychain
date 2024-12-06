import { type Deployment, deployment as contractsAddresses } from "@happychain/contracts/account-abstraction/sepolia"
import { chains } from "@happychain/sdk-shared"

export function getAccountAbstractionContracts(chainId: string): Deployment {
    let contracts = {}

    switch (chainId) {
        case chains.happyChainSepolia.chainId:
            contracts = contractsAddresses
            break
        default:
            contracts = contractsAddresses
    }

    return contracts as Deployment
}
