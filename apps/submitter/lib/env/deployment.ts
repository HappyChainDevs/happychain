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
import type { Environment } from "#lib/env/index"

export function getDeployment(env: Environment) {
    function getBaseDeployment() {
        switch (env.CHAIN_ID) {
            case happychainTestnet.id:
                // Use staging deployment if PROXY_HAS_METADATA is false
                return env.PROXY_HAS_METADATA ? deploymentHappyChainSepolia : deploymentHappyChainSepoliaStaging
            case anvil.id:
                return deploymentAnvil
            default:
                return env.PROXY_HAS_METADATA ? deploymentHappyChainSepolia : deploymentHappyChainSepoliaStaging
        }
    }
    const deployment = getBaseDeployment()
    return {
        ...deployment,
        // TODO: enable overriding the others + abstract over factory type
        EntryPoint: env.DEPLOYMENT_ENTRYPOINT ?? deployment.EntryPoint,
        HappyAccountBeaconProxyFactory: env.DEPLOYMENT_ACCOUNT_FACTORY ?? deployment.HappyAccountBeaconProxyFactory,
        HappyAccountImpl: env.DEPLOYMENT_ACCOUNT_IMPLEMENTATION ?? deployment.HappyAccountImpl,
    }
}

export function getAbis(env: Environment) {
    switch (env.CHAIN_ID) {
        case happychainTestnet.id:
            return env.PROXY_HAS_METADATA ? abisHappyChainSepolia : abisHappyChainSepoliaStaging
        case anvil.id:
            return abisAnvil
        default:
            return env.PROXY_HAS_METADATA ? abisHappyChainSepolia : abisHappyChainSepoliaStaging
    }
}
