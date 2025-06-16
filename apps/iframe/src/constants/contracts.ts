import { shortenAddress } from "@happy.tech/common"
import {
    abis as boopStagingAbis,
    deployment as boopStagingDeployment,
} from "@happy.tech/contracts/boop-staging/sepolia"
import { abis as boopAnvilAbis, deployment as boopAnvilDeployment } from "@happy.tech/contracts/boop/anvil"
import { abis as boopSepoliaAbis, deployment as boopSepoliaDeployment } from "@happy.tech/contracts/boop/sepolia"
import { anvil, happyChainSepolia } from "@happy.tech/wallet-common"
import { type Address, isAddressEqual } from "viem"

// Default chain ID, used for deployment addresses and ABIs. The iframe might (or might not — unsupported)
// works with other chains, but they will need to have the exact same contract deployment (addresses & ABIs).
const chainId = Number(import.meta.env.VITE_CHAIN_ID)

// Only used for chainId === 216 (HappyChain Sepolia).
const useStagingContracts =
    import.meta.env.VITE_USE_STAGING_CONTRACTS === "true" || import.meta.env.VITE_USE_STAGING_CONTRACTS === "1"

//== Utils==========================================================================================

function getBoopDeployment(chainId: number) {
    switch (chainId) {
        case happyChainSepolia.id:
            return useStagingContracts ? boopStagingDeployment : boopSepoliaDeployment
        case anvil.id:
            return boopAnvilDeployment
        default:
            throw new Error(`Unsupported chainId: ${chainId}. Failed to fetch deployments`)
    }
}

function getBoopAbis(chainId: number) {
    switch (chainId) {
        case happyChainSepolia.id:
            return useStagingContracts ? boopStagingAbis : boopSepoliaAbis
        case anvil.id:
            return boopAnvilAbis
        default:
            throw new Error(`Unsupported chainId: ${chainId}. Failed to fetch abis`)
    }
}

//== Deployment Addresses ==========================================================================

export const deployment = getBoopDeployment(chainId)

export const happyPaymaster = deployment.HappyPaymaster
export const entryPoint = deployment.EntryPoint
export const sessionKeyValidator = deployment.SessionKeyValidator

//== Abis ==========================================================================================

export const abis = getBoopAbis(chainId)

export const entryPointAbi = abis.EntryPoint
export const extensibleAccountAbi = abis.HappyAccountImpl
export const sessionKeyValidatorAbi = abis.SessionKeyValidator

//== Paymaster Selectors ===========================================================================

export function getPaymaster(): Address {
    return happyPaymaster
}

export function getPaymasterName(address: Address): string {
    if (isAddressEqual(address, happyPaymaster)) return "HappyChain"
    return shortenAddress(address)
}

export function getSubmitterName(): string {
    return "HappyChain"
}
