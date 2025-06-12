import { getUrlProtocol } from "./urlProtocol"

import { http, type PublicClient, type Transport, createPublicClient, defineChain, webSocket } from "viem"

export function createViemPublicClient(chainId: number, rpcUrl: string): PublicClient {
    const protocolResult = getUrlProtocol(rpcUrl)

    if (protocolResult.error) {
        throw protocolResult.error
    }

    const protocol = protocolResult.result

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
        id: chainId,
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
