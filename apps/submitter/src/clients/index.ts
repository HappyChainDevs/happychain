import { http, createPublicClient, createWalletClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { localhost } from "viem/chains"
import env from "../env"
import { createSubmitterClient } from "./submitterClient/createSubmitterClient"

export const account = privateKeyToAccount(env.PRIVATE_KEY_LOCAL)
export const chain = localhost

const publicConfig = { chain, transport: http() } as const

const walletConfig = { account, ...publicConfig }

export const publicClient = createPublicClient(publicConfig)
export const walletClient = createWalletClient(walletConfig)
export const submitterClient = createSubmitterClient(walletConfig)
