import { abis as happyAAAbisAnvil } from "@happy.tech/contracts/happy-aa/anvil"
import { abis as happyAAAbisSepolia } from "@happy.tech/contracts/happy-aa/sepolia"
import { localhost } from "viem/chains"
import env from "./env"

/**
 * We will use anvil abi's if the the chain has been set to localhost
 * This is because the anvil chain is used for local development and testing
 * and may not always reflect what has been deployed. All other deployed chains
 */
const isAnvil = (env.CHAIN_ID === localhost.id) as boolean
export const abis = isAnvil ? happyAAAbisAnvil : happyAAAbisSepolia
