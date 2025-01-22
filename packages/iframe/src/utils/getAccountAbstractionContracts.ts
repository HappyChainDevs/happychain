import { type Deployment, deployment as contractsAddresses } from "@happychain/contracts/account-abstraction/sepolia"
import { chainDefinitions } from "@happychain/sdk-shared"

export function getAccountAbstractionContracts(chainId: string): Deployment {
    let contracts = {}
    switch (chainId) {
        case chainDefinitions.happyChainSepolia.chainId:
            contracts = contractsAddresses
            break
        default:
            contracts = contractsAddresses
            break
    }

    return contracts as Deployment
}
