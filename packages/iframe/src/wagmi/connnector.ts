import { injected } from "wagmi/connectors"
import { iframeProvider } from "./provider"

/**
 * Custom connector ({@link https://wagmi.sh/core/api/connectors/injected#target | injected connectors})
 */
export const happyConnector = injected({
    shimDisconnect: false,
    target() {
        return {
            id: "iframeProvider",
            name: "HappyChain (Iframe)Provider",
            provider: iframeProvider,
        }
    },
})
