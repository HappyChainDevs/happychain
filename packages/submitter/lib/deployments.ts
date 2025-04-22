import { abis as abisAnvil, deployment as deploymentAnvil } from "@happy.tech/contracts/boop/anvil"
import {
    abis as abisHappyChainSepolia,
    deployment as deploymentHappyChainSepolia,
} from "@happy.tech/contracts/boop/sepolia"
import { happychainTestnet, localhost } from "viem/chains"
import env from "./env"

function getDeployment() {
    switch (env.CHAIN_ID) {
        case happychainTestnet.id:
            return deploymentHappyChainSepolia
        case localhost.id:
            return deploymentAnvil
        default:
            return deploymentHappyChainSepolia
    }
}

function getAbis() {
    switch (env.CHAIN_ID) {
        case happychainTestnet.id:
            return abisHappyChainSepolia
        case localhost.id:
            return abisAnvil
        default:
            return abisHappyChainSepolia
    }
}

export const deployment = getDeployment()
export const abis = getAbis()
