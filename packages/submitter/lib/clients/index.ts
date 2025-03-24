import type { PublicClient as BasePublicClient, WalletClient as BaseWalletClient } from "viem"
import { http, createPublicClient, createWalletClient } from "viem"
import { localhost } from "viem/chains"
import { createSubmitterClient } from "./submitterClient/createSubmitterClient"

export const chain = localhost

export const config = { chain, transport: http() } as const

export const submitterClient = createSubmitterClient()

export type PublicClient = BasePublicClient<typeof config.transport, typeof config.chain>
export const publicClient: PublicClient = createPublicClient(config)

export type WalletClient = BaseWalletClient<typeof config.transport, typeof config.chain, undefined>
export const walletClient: WalletClient = createWalletClient(config)
