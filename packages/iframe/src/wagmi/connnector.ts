import { injected } from "wagmi/connectors"
import { iframeProvider } from "./provider"

/**
 * custom connector: cf. https://wagmi.sh/core/api/connectors/injected#target
 */
export const happyConnector = injected({
    shimDisconnect: false,
    target() {
        return {
            id: "happyProvider",
            name: "HappyChain (iframe) Provider",
            provider: iframeProvider,
        }
    },
})
