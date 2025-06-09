import { getUrlProtocol } from "@happy.tech/common"
import { http, type PublicClient, type Transport, createPublicClient, defineChain, webSocket } from "viem"
import { env } from "./env"

export function createViemPublicClient(rpcUrl: string): PublicClient {
    const protocolResult = getUrlProtocol(rpcUrl)

    if (protocolResult.isErr()) {
        throw protocolResult.error
    }

    const protocol = protocolResult.value

    let transport: Transport
    if (protocol === "http") {
        transport = http(rpcUrl)
    } else {
        transport = webSocket(rpcUrl)
    }

    /**
     * Define the viem chain object.
     * Certain properties required by viem are set to "Unknown" because they are not relevant to our library.
     * This approach eliminates the need for users to provide unnecessary properties when configuring the library.
     */
    const chain = defineChain({
        id: env.CHAIN_ID,
        name: "Unknown",
        rpcUrls: {
            default: {
                http: protocol === "http" ? [rpcUrl] : [],
                webSocket: protocol === "websocket" ? [rpcUrl] : [],
            },
        },
        nativeCurrency: {
            name: "Unknown",
            symbol: "UNKNOWN",
            decimals: 18,
        },
    })

    return createPublicClient({
        transport,
        chain,
    })
}
