import { happyProvider } from "@happychain/js"
import type { CreateConnectorFn } from "wagmi"
import { injected } from "wagmi/connectors"

export const happyWagmiConnector: CreateConnectorFn = injected({
    shimDisconnect: false,
    target() {
        return {
            id: "happyProvider",
            name: "HappyChain Wagmi Provider",
            provider: happyProvider,
        }
    },
})
