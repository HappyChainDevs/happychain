import { Msgs } from "@happy.tech/wallet-common"
import { appMessageBus } from "#src/services/eventBus.ts"

/**
 * Forward error display requests to the front
 */
appMessageBus.on(Msgs.SetOverlayError, (errorCode) => {
    appMessageBus.emit(Msgs.DisplayOverlayError, errorCode)
})
