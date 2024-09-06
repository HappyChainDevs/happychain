import { Msgs, getEIP1193ErrorObjectFromUnknown } from "@happychain/sdk-shared"
import { EIP1193ErrorCodes, getEIP1193ErrorObjectFromCode } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { useWalletClientMiddleware } from "../middleware/walletClient"
import { happyProviderBus, popupListenBus } from "../services/eventBus"
import { walletClientAtom } from "../state/walletClient"
import { confirmWindowId } from "../utils/confirmWindowId"

/**
 * This Hook processes requests that have been received
 * as a result of the user confirmation screen/popup.
 */
export function useProcessConfirmedRequests() {
    const walletClient = useAtomValue(walletClientAtom)

    const runMiddleware = useWalletClientMiddleware()

    // trusted requests may only be sent from same-origin (popup approval screen)
    // and can be sent through the walletClient
    useEffect(() => {
        return popupListenBus.on(Msgs.PopupApprove, async (data) => {
            // wrong window, ignore
            if (!confirmWindowId(data.windowId)) return

            try {
                const payload = await runMiddleware(walletClient, data)

                void happyProviderBus.emit(Msgs.RequestResponse, {
                    key: data.key,
                    windowId: data.windowId,
                    error: null,
                    payload: payload || {},
                })
            } catch (e) {
                void happyProviderBus.emit(Msgs.RequestResponse, {
                    key: data.key,
                    windowId: data.windowId,
                    error: getEIP1193ErrorObjectFromUnknown(e),
                    payload: null,
                })
            }
        })
    }, [walletClient, runMiddleware])

    /**
     * User rejected requests, will be sent here through the Broadcast channel
     * and forwarded to the dapp untouched, where the originating
     * promise will be rejected
     */
    useEffect(() => {
        return popupListenBus.on(Msgs.PopupReject, (data) => {
            if (!confirmWindowId(data.windowId)) return
            void happyProviderBus.emit(Msgs.RequestResponse, data)

            if (data.error) {
                happyProviderBus.emit(Msgs.RequestResponse, data)
            } else {
                happyProviderBus.emit(Msgs.RequestResponse, {
                    key: data.key,
                    windowId: data.windowId,
                    error: getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.UserRejectedRequest),
                    payload: null,
                })
            }
        })
    }, [])
}
