import { type ReactNode, useCallback, useEffect, useState } from "react"

import { init as web3AuthInit } from "@happychain/firebase-web3auth-strategy"
import {
    type EIP1193EventName,
    type EIP1193ProxiedEvents,
    getEIP1193ErrorObjectFromUnknown,
    logger,
} from "@happychain/sdk-shared"
import { requiresApproval } from "@happychain/sdk-shared/lib/services/permissions"
import { getDefaultStore, useAtom, useAtomValue } from "jotai"

import { AuthState } from "@happychain/sdk-shared"
import { waitForCondition } from "@happychain/sdk-shared/lib/utils/waitForCondition"
import { happyProviderBus, popupBus } from "../services/eventBus"
import { providerAtom, publicClientAtom, walletClientAtom } from "../services/provider"
import { authStateAtom } from "../state/app"
import { chainsAtom } from "../state/chains"
import { getPermissions, hasPermission, revokePermission, setPermission } from "../state/permissions"
import { userAtom } from "../state/user"
import { isAddChainParams } from "../utils/isAddChainParam"

const iframeUUID = new URLSearchParams(window.location.search).get("windowId")

const checkRequestUUID = (windowId: ReturnType<typeof crypto.randomUUID>) => windowId === iframeUUID

export function HappyAccountProvider({ children }: { children: ReactNode }) {
    const provider = useAtomValue(providerAtom)
    const publicClient = useAtomValue(publicClientAtom)
    const walletClient = useAtomValue(walletClientAtom)
    const happyUser = useAtomValue(userAtom)
    const [chains, setChains] = useAtom(chainsAtom)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        const init = async () => {
            await web3AuthInit()
            setIsLoaded(true)
            logger.log("Web3Auth is initialized")
        }
        init()
    }, [])

    useEffect(() => {
        const proxyEvent = (name: EIP1193EventName) => (event: unknown) => {
            happyProviderBus.emit("provider:event", {
                payload: { event: name, args: event },
            })
        }

        const connectCallback = proxyEvent("connect")
        const disconnectCallback = proxyEvent("disconnect")
        const chainChangedCallback = proxyEvent("chainChanged")
        const accountsChangedCallback = proxyEvent("accountsChanged")

        provider?.on("connect", connectCallback)
        provider?.on("disconnect", disconnectCallback)
        provider?.on("chainChanged", chainChangedCallback)
        provider?.on("accountsChanged", accountsChangedCallback)

        return () => {
            provider?.removeListener("connect", connectCallback)
            provider?.removeListener("disconnect", disconnectCallback)
            provider?.removeListener("chainChanged", chainChangedCallback)
            provider?.removeListener("accountsChanged", accountsChangedCallback)
        }
    }, [provider])

    const requiresConfirmation = useCallback(
        (payload: EIP1193ProxiedEvents["permission-check:request"]["payload"]) => {
            const basicCheck = requiresApproval(payload)
            //  if the basic check shows its a safe method, we can stop here, and report back
            if (basicCheck === false) {
                return false
            }

            // if its a restricted method, and the user is
            // not logged in, then it needs confirmation
            // always (login screen)
            if (!happyUser?.address) {
                return true
            }

            // only request to add new chains require confirmation
            if (payload.method === "wallet_addEthereumChain") {
                const params =
                    typeof payload.params === "object" && Array.isArray(payload.params) && payload.params?.[0]

                return !isAddChainParams(params) || !chains.some((chain) => chain.chainId === params.chainId)
            }

            if (["wallet_requestPermissions", "eth_requestAccounts"].includes(payload.method)) {
                const needs = !hasPermission(payload as Parameters<typeof hasPermission>[0])
                console.log(
                    `Needs Confirmation: ${!happyUser?.address}/${!hasPermission(payload as Parameters<typeof hasPermission>[0])} ${needs}`,
                    happyUser,
                )
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                console.log({ perms: getPermissions(payload as any) })
                return needs
            }

            return true
        },
        [chains, happyUser],
    )

    useEffect(() => {
        return happyProviderBus.on("permission-check:request", (data) => {
            const result = requiresConfirmation(data.payload)
            return happyProviderBus.emit("permission-check:response", {
                key: data.key,
                windowId: data.windowId,
                error: null,
                payload: result,
            })
        })
    }, [requiresConfirmation])

    // trusted requests may only be sent from same-origin (popup approval screen)
    // and can be sent through the walletClient
    useEffect(() => {
        const offApprove = popupBus.on("request:approve", async (data) => {
            // wrong window, ignore
            if (!checkRequestUUID(data.windowId)) return

            try {
                if ("eth_requestAccounts" === data.payload.method) {
                    setPermission(data.payload as Parameters<typeof setPermission>[0])
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
                    console.log("setting permissions")
                    setPermission(data.payload as Parameters<typeof setPermission>[0])
                    console.log("happyAccount", {
                        key: data.key,
                        windowId: data.windowId,
                        error: null,
                        // biome-ignore lint/suspicious/noExplicitAny: hacky testing, DO NOT LEAVE
                        payload: getPermissions(data.payload as Parameters<typeof getPermissions>[0]) as any,
                    })
                    happyProviderBus.emit("response:complete", {
                        key: data.key,
                        windowId: data.windowId,
                        error: null,
                        // biome-ignore lint/suspicious/noExplicitAny: hacky testing, DO NOT LEAVE
                        payload: getPermissions(data.payload as Parameters<typeof getPermissions>[0]) as any,
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
                    payload: result,
                })
            } catch (e) {
                console.warn({ wallet: e })
                happyProviderBus.emit("response:complete", {
                    key: data.key,
                    windowId: data.windowId,
                    error: getEIP1193ErrorObjectFromUnknown(e),
                    payload: null,
                })
            }
        })
        const offReject = popupBus.on("request:reject", (data) => {
            if (!checkRequestUUID(data.windowId)) return
            happyProviderBus.emit("response:complete", data)
        })
        return () => {
            offApprove()
            offReject()
        }
    }, [walletClient, setChains, happyUser])

    // Untrusted requests can only be called using the public client
    // as they bypass the popup approval screen
    useEffect(() => {
        const offApprove = happyProviderBus.on("request:approve", async (data) => {
            if (!checkRequestUUID(data.windowId)) return
            try {
                const isPublicMethod = !requiresConfirmation(data.payload)
                let authenticated = getDefaultStore().get(authStateAtom) === AuthState.Authenticated

                console.log({ isPublicMethod, authenticated })
                if (getDefaultStore().get(authStateAtom) === AuthState.Loading) {
                    await waitForCondition(() => getDefaultStore().get(authStateAtom) !== AuthState.Loading)
                    authenticated = getDefaultStore().get(authStateAtom) === AuthState.Authenticated
                }

                // not allowed if not logged in (should log in, then be called on wallet client)
                console.warn("ETH_ACCOUNTS", {
                    // biome-ignore lint/suspicious/noExplicitAny: TODO: FIX TYPINGS
                    has: hasPermission(data.payload as any),
                    // biome-ignore lint/suspicious/noExplicitAny: TODO: FIX TYPINGS
                    payload: hasPermission(data.payload as any) ? getDefaultStore().get(userAtom)?.addresses : [],
                    user: getDefaultStore().get(userAtom),
                    state: getDefaultStore().get(authStateAtom),
                    authenticated,
                })
                if (
                    (authenticated && "eth_requestAccounts" === data.payload.method) ||
                    "eth_accounts" === data.payload.method
                ) {
                    // if calling by the public wallet, that means user should already be connected
                    // TODO: verification check here
                    // don't add or update permissions, just report back
                    happyProviderBus.emit("response:complete", {
                        key: data.key,
                        windowId: data.windowId,
                        error: null,
                        // biome-ignore lint/suspicious/noExplicitAny: hacky testing, DO NOT LEAVE
                        payload: hasPermission(data.payload as any) ? getDefaultStore().get(userAtom)?.addresses : [],
                    })
                    // web3auth crashes on this request
                    return
                }

                // not allowed if not logged in (should log in, then be called on wallet client)
                if (authenticated && "wallet_requestPermissions" === data.payload.method) {
                    console.warn("REQUESTING PERMISSIONS SHOULD WORK!", {
                        // biome-ignore lint/suspicious/noExplicitAny: TODO: FIX TYPINGS
                        has: hasPermission(data.payload as any),
                        // biome-ignore lint/suspicious/noExplicitAny: TODO: FIX TYPINGS
                        get: getPermissions(data.payload as any),
                    })
                    // if calling by the public wallet, that means user should already be connected
                    // TODO: verification check here
                    // don't add or update permissions, just report back
                    happyProviderBus.emit("response:complete", {
                        key: data.key,
                        windowId: data.windowId,
                        error: null,
                        // biome-ignore lint/suspicious/noExplicitAny: hacky testing, DO NOT LEAVE
                        payload: hasPermission(data.payload as any)
                            ? // biome-ignore lint/suspicious/noExplicitAny: hacky testing, DO NOT LEAVE
                              (getPermissions(data.payload as Parameters<typeof getPermissions>[0]) as any)
                            : [],
                    })
                    return
                }

                // not allowed if not logged in (should log in, then be called on wallet client)
                if (authenticated && "wallet_revokePermissions" === data.payload.method) {
                    // if calling by the public wallet, that means user should already be connected
                    // TODO: verification check here
                    // don't add or update permissions, just report back
                    revokePermission(data.payload as Parameters<typeof revokePermission>[0])
                    happyProviderBus.emit("response:complete", {
                        key: data.key,
                        windowId: data.windowId,
                        error: null,
                        // biome-ignore lint/suspicious/noExplicitAny: hacky testing, DO NOT LEAVE
                        payload: getPermissions(data.payload as Parameters<typeof getPermissions>[0]) as any,
                    })
                    return
                }

                if (!isPublicMethod) {
                    // emit not allowed error
                    console.warn("can not execute untrusted request", data)
                    return
                }

                // injected providers are allowed to bypass the popup screen
                // as they have their own in-built popup security model

                const result = await publicClient.request(data.payload as Parameters<typeof publicClient.request>)

                happyProviderBus.emit("response:complete", {
                    key: data.key,
                    windowId: data.windowId,
                    error: null,
                    payload: result,
                })
            } catch (e) {
                console.warn({ public: e })
                happyProviderBus.emit("response:complete", {
                    key: data.key,
                    windowId: data.windowId,
                    error: getEIP1193ErrorObjectFromUnknown(e),
                    payload: null,
                })
            }
        })
        return () => {
            offApprove()
        }
    }, [publicClient, requiresConfirmation])

    if (!isLoaded) {
        return null
    }
    return children
}
