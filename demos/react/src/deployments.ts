import { abis as anvilAbis, deployment as anvilDeployments } from "@happy.tech/contracts/mocks/anvil"
import { abis as sepoliaAbis, deployment as sepoliaDeployments } from "@happy.tech/contracts/mocks/sepolia"

export const deployment = Number(import.meta.env.VITE_CHAIN_ID) === 1337 ? anvilDeployments : sepoliaDeployments
export const abis = Number(import.meta.env.VITE_CHAIN_ID) === 1337 ? anvilAbis : sepoliaAbis
