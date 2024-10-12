import type { HTTPString } from "@happychain/common"
import { logger, Msgs } from "@happychain/sdk-shared"
import { appMessageBus } from "../services/eventBus"

if (import.meta.hot) {
    // disable hot reloading here, as when embedded in an iframe,
    // the origin of the dapp after the refresh is always the iframe
    // itself i.e. first load getDappOrigin === localhost:5173,
    // after HMR localhost:5160
    // This has repercussions on the permission system
    import.meta.hot.accept(() => {
        import.meta.hot?.invalidate()
    })
}

export function getIframeOrigin(): HTTPString {
    return location.origin as HTTPString
}

let dappOrigin = (location.ancestorOrigins?.[0] ?? document.referrer) ? new URL(document.referrer).origin : null
// if the iframe refreshes itself without the parent window refreshing,
// dappOrigin and referrer information are lost, and the dappOrigin becomes the iframe
appMessageBus.on(Msgs.OriginResponse, (newOrigin) => {
    dappOrigin = newOrigin
})

export function getDappOrigin(): HTTPString {
    if (!dappOrigin) {
        logger.warn("Unable to determine dApp Origin", getIframeOrigin())
        return getIframeOrigin()
    }
    return dappOrigin as HTTPString
}
