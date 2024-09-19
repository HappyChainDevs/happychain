import { injected } from "wagmi/connectors"
import { customProvider } from "./provider"

/**
 * custom connector: cf. https://wagmi.sh/core/api/connectors/injected#target
 */
export const happyConnector = injected({
    shimDisconnect: false,
    target() {
        return {
            id: "happyProvider",
            name: "HappyChain Provider",
            provider: customProvider,
        }
    },
})
