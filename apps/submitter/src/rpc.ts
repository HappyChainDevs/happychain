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
const client = hc<AppType>("")
export type Client = typeof client
export const hcWithType = (...args: Parameters<typeof hc>): Client => hc<AppType>(...args)
