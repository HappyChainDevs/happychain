import { abis as abisAnvil, deployment as deploymentAnvil } from "@happy.tech/contracts/boop/anvil"
import {
    // abis as abisHappyChainSepolia,
    deployment as deploymentHappyChainSepolia,
} from "@happy.tech/contracts/boop/sepolia"
import { http, type Address, type Hex, createPublicClient } from "viem"
import { anvil, happychainTestnet } from "viem/chains"
import type { Environment } from "#lib/env/index"

/**
 * Gets the base deployment based on the chain ID
 */
function getBaseDeployment(chainId: number) {
    switch (chainId) {
        case happychainTestnet.id:
            return deploymentHappyChainSepolia
        case anvil.id:
            return deploymentAnvil
        default:
            return deploymentHappyChainSepolia
    }
}

/**
 * Fetches the proxy creation code from the factory contract
 */
async function fetchProxyCreationCode(env: Environment, factoryAddress: Address): Promise<Hex> {
    try {
        const publicClient = createPublicClient({
            chain: env.CHAIN_ID === anvil.id ? anvil : happychainTestnet,
            transport: http(env.RPC_URL),
        })

        const creationCode = (await publicClient.readContract({
            address: factoryAddress,
            abi: abis.HappyAccountBeaconProxyFactory,
            functionName: "getProxyCreationCode",
        })) as Hex

        return creationCode
    } catch {
        return "0x"
    }
}

/**
 * Builds the final deployment configuration by applying environment overrides
 */
export async function getDeployment(env: Environment) {
    // Get the base deployment from the chain ID
    const baseDeployment = getBaseDeployment(env.CHAIN_ID)

    // Apply environment overrides for contract addresses
    const factoryAddress = env.DEPLOYMENT_ACCOUNT_FACTORY ?? baseDeployment.HappyAccountBeaconProxyFactory
    const entryPointAddress = env.DEPLOYMENT_ENTRYPOINT ?? baseDeployment.EntryPoint
    const implementationAddress = env.DEPLOYMENT_ACCOUNT_IMPLEMENTATION ?? baseDeployment.HappyAccountImpl

    // Fetch or use provided creation code
    const creationCode =
        env.DEPLOYMENT_ACCOUNT_FACTORY_CREATION_CODE ?? (await fetchProxyCreationCode(env, factoryAddress))

    // Return the final deployment configuration
    return {
        ...baseDeployment,

        // TODO: enable overriding the others + abstract over factory type
        // Contract addresses (with overrides applied)
        EntryPoint: entryPointAddress,
        HappyAccountBeaconProxyFactory: factoryAddress,
        HappyAccountImpl: implementationAddress,

        // Additional configuration
        AccountProxyCreationCode: creationCode,
    }
}

export const abis = abisAnvil // abisHappyChainSepolia // TODO temp
