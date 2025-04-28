import { deployment as deploymentAnvil } from "@happy.tech/contracts/boop/anvil"
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
                return deploymentHappyChainSepolia
            case anvil.id:
                return deploymentAnvil
            default:
                return deploymentHappyChainSepolia
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

export const abis = abisHappyChainSepolia
