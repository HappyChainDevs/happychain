import { getEIP1193ErrorObjectFromUnknown } from "@happychain/sdk-shared"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"

import { happyProviderBus, popupBus } from "../services/eventBus"
import { getPermissions } from "../services/permissions/getPermissions"
import { setPermission } from "../services/permissions/setPermission"
import { chainsAtom } from "../state/chains"
import { userAtom } from "../state/user"
import { walletClientAtom } from "../state/walletClient"
import { confirmWindowId } from "../utils/confirmWindowId"
import { isAddChainParams } from "../utils/isAddChainParam"

/**
 * This Hook processes requests that have been received
 * as a result of the user confirmation screen/popup.
 */
export function useProcessConfirmedRequests() {
    const walletClient = useAtomValue(walletClientAtom)
    const happyUser = useAtomValue(userAtom)
    const setChains = useSetAtom(chainsAtom)

    // trusted requests may only be sent from same-origin (popup approval screen)
    // and can be sent through the walletClient
    useEffect(() => {
        return popupBus.on("request:approve", async (data) => {
            // wrong window, ignore
            if (!confirmWindowId(data.windowId)) return

            try {
                if ("eth_requestAccounts" === data.payload.method) {
                    setPermission(data.payload)
                    happyProviderBus.emit("response:complete", {
                        key: data.key,
                        windowId: data.windowId,
                        error: null,
                        payload: happyUser?.addresses,
                    })
                    // web3auth crashes on this request
                    return
                }

                if ("wallet_requestPermissions" === data.payload.method) {
                    setPermission(data.payload)

                    happyProviderBus.emit("response:complete", {
                        key: data.key,
                        windowId: data.windowId,
                        error: null,
                        payload: getPermissions(data.payload),
                    })
                    return
                }

                const result = await walletClient?.request(data.payload as Parameters<typeof walletClient.request>[0])

                if (data.payload.method === "wallet_addEthereumChain") {
                    const params: unknown =
                        typeof data.payload.params === "object" &&
                        Array.isArray(data.payload.params) &&
                        data.payload.params?.[0]

                    if (isAddChainParams(params)) {
                        setChains((previous) => [...previous, params])
                    }
                }

                happyProviderBus.emit("response:complete", {
                    key: data.key,
                    windowId: data.windowId,
                    error: null,
                    payload: result || {},
                })
            } catch (e) {
                happyProviderBus.emit("response:complete", {
                    key: data.key,
                    windowId: data.windowId,
                    error: getEIP1193ErrorObjectFromUnknown(e),
                    payload: null,
                })
            }
        })
    }, [walletClient, setChains, happyUser])

    /**
     * User rejected requests, will be sent here through the Broadcast channel
     * and forwarded to the dapp untouched, where the originating
     * promise will be rejected
     */
    useEffect(() => {
        return popupBus.on("request:reject", (data) => {
            if (!confirmWindowId(data.windowId)) return
            happyProviderBus.emit("response:complete", data)
        })
    }, [])
}
