import type { Prettify } from "@happy.tech/common"
import type { Address } from "abitype"

/**
 * Viem-compatible Chain type, to work around API-extractor issues.
 */
export type Chain = {
    /** Collection of block explorers */
    blockExplorers?:
        | {
              [key: string]: ChainBlockExplorer
              default: ChainBlockExplorer
          }
        | undefined
    /** Collection of contracts */
    contracts?:
        | Prettify<
              {
                  [key: string]:
                      | ChainContract
                      | {
                            [sourceId: number]: ChainContract | undefined
                        }
                      | undefined
              } & {
                  ensRegistry?: ChainContract | undefined
                  ensUniversalResolver?: ChainContract | undefined
                  multicall3?: ChainContract | undefined
                  universalSignatureVerifier?: ChainContract | undefined
              }
          >
        | undefined
    /** ID in number form */
    id: number
    /** Human-readable name */
    name: string
    /** Currency used by chain */
    nativeCurrency: ChainNativeCurrency
    /** Collection of RPC endpoints */
    rpcUrls: {
        [key: string]: ChainRpcUrls
        default: ChainRpcUrls
    }
    /** Source Chain ID (ie. the L1 chain) */
    sourceId?: number | undefined
    /** Flag for test networks */
    testnet?: boolean | undefined
}

/**
 * Viem-compatible type, used in {@link Chain}.
 */
export type ChainBlockExplorer = {
    name: string
    url: string
    apiUrl?: string | undefined
}

/**
 * Viem-compatible type, used in {@link Chain}.
 */
export type ChainContract = {
    address: Address
    blockCreated?: number | undefined
}

/**
 * Viem-compatible type, used in {@link Chain}.
 */
export type ChainNativeCurrency = {
    name: string
    /** 2-6 characters long */
    symbol: string
    decimals: number
}

/**
 * Viem-compatible type, used in {@link Chain}.
 */
export type ChainRpcUrls = {
    http: readonly string[]
    webSocket?: readonly string[] | undefined
}
