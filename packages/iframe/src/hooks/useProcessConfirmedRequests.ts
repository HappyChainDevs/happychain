import { Messages, chains, getEIP1193ErrorObjectFromUnknown } from "@happychain/sdk-shared"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"

import { happyProviderBus, popupListenBus } from "../services/eventBus"
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
        return popupListenBus.on(Messages.PopupApprove, async (data) => {
            // wrong window, ignore
            if (!confirmWindowId(data.windowId)) return

            try {
                /**
                 * web3Auth doesn't support these permission based requests
                 * so we need to handle these manually ourselves
                 * - eth_requestAccounts
                 * - eth_accounts* web3Auth does support this, but always returned the users address, regardless of set permissions
                 * - wallet_requestPermissions
                 * - wallet_getPermissions
                 * - wallet_revokePermissions
                 */
                if ("eth_requestAccounts" === data.payload.method) {
                    setPermission(data.payload)
                    void happyProviderBus.emit(Messages.RequestResponse, {
                        key: data.key,
                        windowId: data.windowId,
                        error: null,
                        payload: happyUser?.addresses,
                    })
                    return
                }

                if ("wallet_requestPermissions" === data.payload.method) {
                    setPermission(data.payload)

                    void happyProviderBus.emit(Messages.RequestResponse, {
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

                if (data.payload.method === "wallet_switchEthereumChain") {
                    if ("URLSearchParams" in window) {
                        const searchParams = new URLSearchParams(window.location.search)
                        const chainId = data.payload.params[0].chainId
                        const chain = Object.values(chains).find((chain) => chain.chainId === chainId)
                        searchParams.set("chain", JSON.stringify(chain))
                        history.replaceState(
                            history.state,
                            "",
                            `${location.origin}${location.pathname}?${searchParams.toString()}`,
                        )
                    }
                }

                void happyProviderBus.emit(Messages.RequestResponse, {
                    key: data.key,
                    windowId: data.windowId,
                    error: null,
                    payload: result || {},
                })
            } catch (e) {
                void happyProviderBus.emit(Messages.RequestResponse, {
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
        return popupListenBus.on(Messages.PopupReject, (data) => {
            if (!confirmWindowId(data.windowId)) return
            void happyProviderBus.emit(Messages.RequestResponse, data)
        })
    }, [])
}
