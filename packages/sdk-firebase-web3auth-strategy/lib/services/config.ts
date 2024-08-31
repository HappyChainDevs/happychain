import { getChainFromSearchParams } from "@happychain/sdk-shared"
import { z } from "zod"

const configSchema = z.object({
    // that has a name property that's a string
    web3AuthNetwork: z.union([z.literal("sapphire_devnet"), z.literal("sapphire_mainnet")]).default("sapphire_devnet"),
    web3AuthChainNamespace: z
        .union([z.literal("eip155"), z.literal("solana"), z.literal("casper"), z.literal("xrpl"), z.literal("other")])
        .default("eip155"),

    // network settings
    // loosely based on https://eips.ethereum.org/EIPS/eip-3085
    chainId: z.string().trim(),
    blockExplorerUrls: z.string().trim().url().array().optional(),
    chainName: z.string().trim(),
    iconUrls: z.string().trim().url().array().optional(),
    nativeCurrency: z.object({
        name: z.string().trim(),
        symbol: z.string().trim(),
        decimals: z.coerce.number(),
    }),
    rpcUrls: z.string().trim().url().array().min(1),
})

const chain = getChainFromSearchParams()

// url search params with web3Auth specific .env fallbacks
const parsedConfig = configSchema.safeParse({
    // web3 auth settings - set on deployment
    web3AuthNetwork: import.meta.env.VITE_WEB3AUTH_NETWORK,
    web3AuthChainNamespace: "eip155",

    // network settings
    // loosely based on https://eips.ethereum.org/EIPS/eip-3085
    iconUrls: chain.iconUrls,
    chainId: chain.chainId,
    blockExplorerUrls: chain.blockExplorerUrls,
    chainName: chain.chainName,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: chain.rpcUrls,
})

if (!parsedConfig.success) {
    console.error(parsedConfig.error.issues)
    throw new Error("There is an error configuring blockchain network connection")
}

export const config = parsedConfig.data
