import { http, createPublicClient } from "viem"
import { localhost } from "viem/chains"
import { createSubmitterClient } from "./submitterClient/createSubmitterClient"

export const chain = localhost

const publicConfig = { chain, transport: http() } as const

export const publicClient = createPublicClient(publicConfig)

export const submitterClient = createSubmitterClient(publicConfig) // don't hoist account, so it can be injected per address
