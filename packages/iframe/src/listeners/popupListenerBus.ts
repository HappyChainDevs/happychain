import { Msgs } from "@happychain/sdk-shared"
import { handleApprovedRequest, handleRejectedRequest } from "../requests"

/**
 * PopUp RPC requests sent from request popup. Approved requests
 * will be processed and pass through the walletClient middleware stack
 * before being executed. Rejected requests will simple be forwarded to
 * the requesting app to be handled by the developer.
 */
window.addEventListener("message", (msg) => {
    // only trust same origin requests
    if (msg.origin !== window.location.origin) return
    if (msg.data.scope !== "server:popup") return

    switch (msg.data.type) {
        case Msgs.PopupApprove: {
            handleApprovedRequest(msg.data.payload)
            msg.source?.postMessage("request-close")
            return
        }
        case Msgs.PopupReject: {
            handleRejectedRequest(msg.data.payload)
            msg.source?.postMessage("request-close")
            return
        }
    }
})
