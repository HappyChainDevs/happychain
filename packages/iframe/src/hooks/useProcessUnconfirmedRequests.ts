import { Msgs, getEIP1193ErrorObjectFromUnknown } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { usePublicClientMiddleware } from "../middleware/publicClient"
import { happyProviderBus } from "../services/eventBus"
import { publicClientAtom } from "../state/publicClient"
import { confirmWindowId } from "../utils/confirmWindowId"

export function useProcessUnconfirmedRequests() {
    const publicClient = useAtomValue(publicClientAtom)

    const runMiddleware = usePublicClientMiddleware()

    // Untrusted requests can only be called using the public client
    // as they bypass the popup approval screen
    useEffect(() => {
        return happyProviderBus.on(Msgs.RequestPermissionless, async (data) => {
            if (!confirmWindowId(data.windowId)) return

            try {
                const payload = await runMiddleware(publicClient, data)

                happyProviderBus.emit(Msgs.RequestResponse, {
                    key: data.key,
                    windowId: data.windowId,
                    error: null,
                    payload: payload,
                })
            } catch (e) {
                happyProviderBus.emit(Msgs.RequestResponse, {
                    key: data.key,
                    windowId: data.windowId,
                    error: getEIP1193ErrorObjectFromUnknown(e),
                    payload: null,
                })
            }
        })
    }, [publicClient, runMiddleware])
}
