import { http, createPublicClient } from "viem"
import { localhost } from "viem/chains"
import { createSubmitterClient } from "./submitterClient/createSubmitterClient"

export const chain = localhost

const config = { chain, transport: http() } as const

export const publicClient = createPublicClient(config)

// don't hoist account, so it can be injected on demand, per address
export const submitterClient = createSubmitterClient(config)
