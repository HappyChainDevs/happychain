import {
    abis as abisHappyChainSepoliaStaging,
    deployment as deploymentHappyChainSepoliaStaging,
} from "@happy.tech/contracts/boop-staging/sepolia"
import { abis as abisAnvil, deployment as deploymentAnvil } from "@happy.tech/contracts/boop/anvil"
import {
    abis as abisHappyChainSepolia,
    deployment as deploymentHappyChainSepolia,
} from "@happy.tech/contracts/boop/sepolia"
import { anvil, happychainTestnet } from "viem/chains"
import type { Environment } from "#lib/env"

export function getDeployment(env: Environment) {
    function getBaseDeployment() {
        switch (env.CHAIN_ID) {
            case anvil.id:
                return deploymentAnvil
            case happychainTestnet.id:
            default:
                return env.USE_STAGING_CONTRACTS ? deploymentHappyChainSepoliaStaging : deploymentHappyChainSepolia
        }
    }
    const deployment = getBaseDeployment()
    return {
        ...deployment,
        // TODO: abstract over factory type
        EntryPoint: env.DEPLOYMENT_ENTRYPOINT ?? deployment.EntryPoint,
        HappyAccountBeaconProxyFactory: env.DEPLOYMENT_ACCOUNT_FACTORY ?? deployment.HappyAccountBeaconProxyFactory,
        HappyAccountImpl: env.DEPLOYMENT_ACCOUNT_IMPLEMENTATION ?? deployment.HappyAccountImpl,
    }
}

export function getAbis(env: Environment) {
    switch (env.CHAIN_ID) {
        case anvil.id:
            return abisAnvil
        case happychainTestnet.id:
        default:
            return env.USE_STAGING_CONTRACTS ? abisHappyChainSepolia : abisHappyChainSepoliaStaging
    }
}
