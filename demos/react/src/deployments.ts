import { abis as anvilAbis, deployment as anvilDeployments } from "@happy.tech/contracts/mocks/anvil"
import { abis as sepoliaAbis, deployment as sepoliaDeployments } from "@happy.tech/contracts/mocks/sepolia"
import { localhost } from "viem/chains"

export const deployment = Number(import.meta.env.VITE_CHAIN_ID) === localhost.id ? anvilDeployments : sepoliaDeployments
export const abis = Number(import.meta.env.VITE_CHAIN_ID) === localhost.id ? anvilAbis : sepoliaAbis
