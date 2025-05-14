import { HappyProviderImplem } from "./happyProviderImplem"
import type { HappyProvider, HappyProviderInternal } from "./interface"

export const internalProvider: HappyProviderInternal = HappyProviderImplem.instance()

/**
 * HappyProvider is an [EIP1193](https://eips.ethereum.org/EIPS/eip-1193) Ethereum Provider.
 *
 * Type: {@link HappyProvider}
 *
 * @example
 * ### Setting up viem client
 * ```ts twoslash
 * import { createPublicClient, custom } from "viem"
 * import { happyProvider } from "@happy.tech/core"
 * // ---cut---
 * const publicClient = createPublicClient({
 *   transport: custom(happyProvider)
 * })
 * ```
 */
// @ts-ignore
export declare const happyProvider: HappyProvider

/** @ignore */
// @ts-ignore
// biome-ignore lint/suspicious/noRedeclare: hide assignment from docs
export const happyProvider = internalProvider

export type { HappyProvider, HappyProviderInternal } from "./interface"

export { windowId } from "./happyProviderImplem"
