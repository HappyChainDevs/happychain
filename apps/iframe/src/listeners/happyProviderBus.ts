import { Msgs } from "@happy.tech/wallet-common"
import { handleInjectedRequest, handlePermissionlessRequest } from "#src/requests"
import { happyProviderBus } from "#src/services/eventBus"
import { getAppURL } from "#src/utils/appURL"
import { checkIfRequestRequiresConfirmation } from "#src/requests/checkIfRequestRequiresConfirmation"

/**
 * Process direct-from-app RPC requests using the public client and publicClient middleware stack
 */
happyProviderBus.on(Msgs.RequestPermissionless, handlePermissionlessRequest)

/**
 * Process direct-from-app RPC requests using the injected wallet client middleware stack
 */
happyProviderBus.on(Msgs.RequestInjected, handleInjectedRequest)

/**
 * Receives permission checks from the dapp for all requests,
 * processes the request using the above criteria,
 * returns the response to the dapp.
 *
 * The dapp uses this to determine a confirmation screen is required or not
 *
 * if the confirmation screen is required, then the request won't be forwarded
 * until it has passed the confirmation screen
 *
 * if the confirmation screen is deemed not required, it is sent directly
 * to the iframe to be processed.
 *
 * Note: if no confirmation screen was used, the iframe will re-process
 * this within the context of the iframe
 * to determine if it should actually be executed, and if it fails,
 * the request will be rejected
 */
happyProviderBus.on(Msgs.PermissionCheckRequest, (data) => {
    const result = checkIfRequestRequiresConfirmation(getAppURL(), data.payload)
    return happyProviderBus.emit(Msgs.PermissionCheckResponse, {
        key: data.key,
        windowId: data.windowId,
        error: null,
        payload: result,
    })
})
