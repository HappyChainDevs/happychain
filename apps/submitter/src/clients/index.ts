import { happyChainSepolia } from "@happy.tech/wallet-common"
import { http, createPublicClient, createWalletClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import env from "../env"
import { createSubmitterClient } from "./submitterClient/createSubmitterClient"

const publicConfig = {
    chain: happyChainSepolia,
    transport: http(happyChainSepolia.rpcUrls.default.http[0]),
} as const

const walletConfig = {
    account: privateKeyToAccount(env.PRIVATE_KEY_LOCAL),
    ...publicConfig,
}

export const publicClient = createPublicClient(publicConfig)
export const walletClient = createWalletClient(walletConfig)
export const submitterClient = createSubmitterClient(walletConfig)
