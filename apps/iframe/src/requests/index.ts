import type { Msgs, PopupMsgs, ProviderMsgsFromApp } from "@happy.tech/wallet-common"
import { dispatchApprovedRequest } from "#src/requests/handlers/approved"
import { dispatchInjectedRequest } from "#src/requests/handlers/injected"
import { dispatchedPermissionlessRequest } from "#src/requests/handlers/permissionless"
import { sendResponse } from "#src/requests/utils/sendResponse"
import { reqLogger } from "#src/utils/logger"

export { handleRejectedRequest } from "./handlers/rejected"

/**
 * Handles requests approved by the user in the pop-up, when connected to a social wallet (e.g. Google Auth).
 */
export async function handleApprovedRequest(request: PopupMsgs[Msgs.PopupApprove]): Promise<void> {
    reqLogger.trace("approved request:", request.payload.method, request)
    return await sendResponse(request, dispatchApprovedRequest)
}

/**
 * Handles requests that do not require user approval, when connected to a social wallet (e.g. Google Auth).
 */
export function handlePermissionlessRequest(request: ProviderMsgsFromApp[Msgs.RequestPermissionless]) {
    reqLogger.trace("permissionless request:", request.payload.method, request)
    void sendResponse(request, dispatchedPermissionlessRequest)
}

/**
 * Handles requests using the connected injected wallet (e.g. Metamask), both requiring and not requiring approval
 * (approval is given in the injected wallet itself).
 */
export function handleInjectedRequest(request: ProviderMsgsFromApp[Msgs.RequestInjected]) {
    reqLogger.trace("injected request:", request.payload.method, request)
    void sendResponse(request, dispatchInjectedRequest)
}
