import { http, type PublicClient, type WalletClient, createPublicClient, createWalletClient } from "viem"
import { entryPoint07Address } from "viem/account-abstraction"
import { privateKeyToAccount } from "viem/accounts"
import { localhost } from "viem/chains"

import { type PimlicoClient, createPimlicoClient } from "permissionless/clients/pimlico"
import { bundlerRpc, privateKey, rpcURL } from "./config"

export const account = privateKeyToAccount(privateKey)

export const walletClient: WalletClient = createWalletClient({
    account,
    chain: localhost,
    transport: http(rpcURL),
})

export const publicClient: PublicClient = createPublicClient({
    chain: localhost,
    transport: http(rpcURL),
})

export const pimlicoClient: PimlicoClient = createPimlicoClient({
    chain: localhost,
    transport: http(bundlerRpc),
    entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
    },
})
