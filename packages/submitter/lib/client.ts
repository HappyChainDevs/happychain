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
import { hc } from "hono/client"
import type { AppType } from "./server"

// compile types: https://hono.dev/docs/guides/rpc#compile-your-code-before-using-it-recommended
export const client = hc<AppType>("")
export type Client = typeof client
export function clientFactory(...args: Parameters<typeof hc>): Client {
    return hc<AppType>(...args)
}

export type { ClientResponse } from "hono/client"
export { computeHappyTxHash } from "./utils/getHappyTxHash"

// export * from "./tmp/interface/status"
// export * from "./tmp/interface/common_chain"
// export * from "./tmp/interface/SimulationResult"
// export * from "./tmp/interface/HappyTxState"
// export * from "./tmp/interface/HappyTxReceipt"

// export { SubmitterErrorStatus } from "#lib/tmp/interface/status"
