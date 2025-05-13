import { connect, disconnect } from "@wagmi/core"
import { config } from "./config"
import { happyConnector } from "./connector"

/**
 * Connects wagmi to the iframe provider.
 */
export async function connectWagmi() {
    return await connect(config, { connector: happyConnector })
}

/**
 * Disconnects wagmi from the iframe provider.
 */
export async function disconnectWagmi() {
    try {
        // if wagmi was not previously connected, this will throw an error
        return await disconnect(config)
    } catch {}
}
