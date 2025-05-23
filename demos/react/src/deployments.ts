import { abis as anvilAbis, deployment as anvilDeployments } from "@happy.tech/contracts/mocks/anvil"
import { abis as sepoliaAbis, deployment as sepoliaDeployments } from "@happy.tech/contracts/mocks/sepolia"
import { anvil } from "viem/chains"

export const deployment = Number(import.meta.env.HAPPY_CHAIN_ID) === anvil.id ? anvilDeployments : sepoliaDeployments
export const abis = Number(import.meta.env.HAPPY_CHAIN_ID) === anvil.id ? anvilAbis : sepoliaAbis
