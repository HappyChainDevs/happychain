import { http, createPublicClient, createWalletClient } from "viem"
import { entryPoint07Address } from "viem/account-abstraction"
import { privateKeyToAccount } from "viem/accounts"
import { localhost } from "viem/chains"

import { type PimlicoClient, createPimlicoClient } from "permissionless/clients/pimlico"
import { bundlerRpc, privateKey, rpcURL } from "./config"

const account = privateKeyToAccount(privateKey)

const walletClient = createWalletClient({
    account,
    chain: localhost,
    transport: http(rpcURL),
})

const publicClient = createPublicClient({
    chain: localhost,
    transport: http(rpcURL),
})

const pimlicoClient: PimlicoClient = createPimlicoClient({
    chain: localhost,
    transport: http(bundlerRpc),
    entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
    },
})

export { walletClient, publicClient, pimlicoClient, account }
