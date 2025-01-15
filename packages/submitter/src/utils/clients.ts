import type { Account, PublicClient, WalletClient } from "viem"
import { http, createPublicClient, createWalletClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { localhost } from "viem/chains"

import { privateKey, rpcURL } from "./config"

export const account: Account = privateKeyToAccount(privateKey)

export const walletClient: WalletClient = createWalletClient({
    account,
    chain: localhost,
    transport: http(rpcURL),
})

export const publicClient: PublicClient = createPublicClient({
    chain: localhost,
    transport: http(rpcURL),
})
