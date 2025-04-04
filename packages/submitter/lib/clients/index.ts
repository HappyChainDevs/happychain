import type { PublicClient as BasePublicClient, WalletClient as BaseWalletClient } from "viem"
import { http, createPublicClient, createWalletClient } from "viem"
import { happychainTestnet, localhost } from "viem/chains"
import env from "../env"

export const chain = [localhost, happychainTestnet].find((chain) => chain.id === env.CHAIN_ID) ?? localhost

export const config = { chain, transport: http() } as const

export type PublicClient = BasePublicClient<typeof config.transport, typeof config.chain>
export const publicClient: PublicClient = createPublicClient(config)

export type WalletClient = BaseWalletClient<typeof config.transport, typeof config.chain, undefined>
export const walletClient: WalletClient = createWalletClient(config)
