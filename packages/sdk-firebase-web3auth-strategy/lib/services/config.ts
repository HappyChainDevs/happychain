import { z } from "zod"

const u = new URLSearchParams(window.location.search)

const configSchema = z.object({
    // that has a name property that's a string
    web3AuthNetwork: z.union([z.literal("sapphire_devnet"), z.literal("sapphire_mainnet")]).default("sapphire_devnet"),
    web3AuthChainNamespace: z
        .union([z.literal("eip155"), z.literal("solana"), z.literal("casper"), z.literal("xrpl"), z.literal("other")])
        .default("eip155"),

    // network settings
    // loosely based on https://eips.ethereum.org/EIPS/eip-3085
    chainId: z.string().trim(),
    blockExplorerUrls: z.string().trim().url().array(),
    chainName: z.string().trim(),
    iconUrls: z.string().trim().url().array().optional(),
    nativeCurrency: z.object({
        name: z.string().trim(),
        symbol: z.string().trim(),
        decimals: z.coerce.number(),
    }),
    rpcUrls: z.string().trim().url().array().min(1),
})

// url search params with web3Auth specific .env fallbacks
const parsedConfig = configSchema.safeParse({
    // web3 auth settings
    web3AuthNetwork: u.get("web3Auth:network") ?? import.meta.env.VITE_WEB3AUTH_NETWORK,
    web3AuthChainNamespace: u.get("web3Auth:chainNamespace") ?? import.meta.env.VITE_WEB3AUTH_CHAIN_NAMESPACE,

    // network settings
    // loosely based on https://eips.ethereum.org/EIPS/eip-3085
    chainId: u.get("chain:chainId") ?? import.meta.env.VITE_WEB3AUTH_CHAIN_ID,
    blockExplorerUrls:
        u.get("chain:blockExplorerUrls")?.split(",")[0] ??
        import.meta.env.VITE_WEB3AUTH_CHAIN_BLOCK_EXPLORER.split(","),
    chainName: u.get("chain:chainName") ?? import.meta.env.VITE_WEB3AUTH_CHAIN_DISPLAYNAME,
    iconUrls: u.get("chain:iconUrls")?.split(","),
    nativeCurrency: {
        name: u.get("chain:nativeCurrency:name") ?? import.meta.env.VITE_WEB3AUTH_CHAIN_TOKEN_NAME,
        symbol: u.get("chain:nativeCurrency:symbol") ?? import.meta.env.VITE_WEB3AUTH_CHAIN_TOKEN_SYMBOL,
        decimals: u.get("chain:nativeCurrency:decimals") ?? import.meta.env.VITE_WEB3AUTH_CHAIN_TOKEN_DECIMALS ?? 18,
    },
    rpcUrls: u.get("chain:rpcUrls")?.split(",") ?? import.meta.env.VITE_WEB3AUTH_CHAIN_RPC.split(","),
})

if (!parsedConfig.success) {
    console.error(parsedConfig.error.issues)
    throw new Error("There is an error with the server environment variables")
}

export const config = parsedConfig.data
