import { connect, disconnect } from "@wagmi/core"
import { config } from "./config"
import { happyConnector } from "./connector"

export async function connectWagmi() {
    return await connect(config, { connector: happyConnector })
}

export async function disconnectWagmi() {
    return await disconnect(config)
}
