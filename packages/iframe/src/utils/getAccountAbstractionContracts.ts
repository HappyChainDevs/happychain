import { type ContractName, deployment as contractsAddresses } from "@happychain/contracts/account-abstraction/sepolia"
import { chains } from "@happychain/sdk-shared"
import type { Address } from "viem"

type AccountAbstractionContracts = { [Name in ContractName]: Address }

export function getAccountAbstractionContracts(chainId: string): AccountAbstractionContracts {
    let contracts = {}
    switch (chainId) {
        case chains.happyChainSepolia.chainId:
            contracts = contractsAddresses
            break
        default:
            contracts = contractsAddresses
            break
    }

    return contracts as AccountAbstractionContracts
}
