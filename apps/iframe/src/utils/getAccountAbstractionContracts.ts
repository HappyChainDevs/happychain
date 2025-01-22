import { type Deployment, deployment as contractsAddresses } from "@happy.tech/contracts/account-abstraction/sepolia"
import { chainDefinitions } from "@happy.tech/wallet-common"

export function getAccountAbstractionContracts(chainId: string): Deployment {
    let contracts = {}

    switch (chainId) {
        case chainDefinitions.happyChainSepolia.chainId:
            contracts = contractsAddresses
            break
        default:
            contracts = contractsAddresses
    }

    return contracts as Deployment
}
