/**
 * Client Side RPC
 *
 * @example
 * ```ts
 * import { hc } from "hono/client"
 *
 * const client = hc<AppType>("http://localhost:3001")
 * client.api.v1.submit_estimateGas(...)
 * ```
 */
import { type ClientResponse, hc } from "hono/client"
import type { AppType } from "./server"

// compile types: https://hono.dev/docs/guides/rpc#compile-your-code-before-using-it-recommended
const clientType = hc<AppType>("")
export type Client = typeof clientType
export function client(...args: Parameters<typeof hc>): typeof clientType {
    return hc<AppType>(...args)
}

export { computeHappyTxHash } from "./utils/getHappyTxHash"

export type CreateAccountReturnType = Awaited<ReturnType<typeof clientType.api.v1.accounts.create.$post>>
export type { ClientResponse, AppType }
export * from "./tmp/interface/HappyTxState"
export * from "./tmp/interface/status"
export * from "./tmp/interface/common_chain"
// tmp/interface/HappyTxState'
// tmp/interface/common_chain'
// tmp/interface/status
