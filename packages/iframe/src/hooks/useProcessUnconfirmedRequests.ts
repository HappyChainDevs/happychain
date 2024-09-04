import { AuthState, getEIP1193ErrorObjectFromUnknown, waitForCondition } from "@happychain/sdk-shared"
import { getDefaultStore, useAtomValue } from "jotai"
import { useEffect } from "react"

import { UnauthorizedProviderError } from "viem"
import { usePermissionsCheck } from "../hooks/usePermissionsCheck"
import { happyProviderBus } from "../services/eventBus"
import { getPermissions } from "../services/permissions/getPermissions"
import { hasPermission } from "../services/permissions/hasPermission"
import { revokePermission } from "../services/permissions/revokePermission"
import { authStateAtom } from "../state/authState"
import type { WalletPermission } from "../state/permissions"
import { publicClientAtom } from "../state/publicClient"
import { userAtom } from "../state/user"
import { confirmWindowId } from "../utils/confirmWindowId"

export function useProcessUnconfirmedRequests() {
    const publicClient = useAtomValue(publicClientAtom)

    const { checkIfRequestRequiresConfirmation: requiresConfirmation } = usePermissionsCheck()

    // Untrusted requests can only be called using the public client
    // as they bypass the popup approval screen
    useEffect(() => {
        return happyProviderBus.on("request:approve", async (data) => {
            if (!confirmWindowId(data.windowId)) return
            try {
                const isPublicMethod = !requiresConfirmation(data.payload)
                let connected = getDefaultStore().get(authStateAtom) === AuthState.Connected

                if (getDefaultStore().get(authStateAtom) === AuthState.Connecting) {
                    await waitForCondition(() => getDefaultStore().get(authStateAtom) !== AuthState.Connecting)
                    connected = getDefaultStore().get(authStateAtom) === AuthState.Connected
                }

                /**
                 * web3Auth doesn't support these permission based requests
                 * so we need to handle these manually ourselves
                 * - eth_requestAccounts
                 * - eth_accounts* web3Auth does support this, but always returned the users address, regardless of set permissions
                 * - wallet_requestPermissions
                 * - wallet_getPermissions
                 * - wallet_revokePermissions
                 */
                if (
                    (connected && "eth_requestAccounts" === data.payload.method) ||
                    "eth_accounts" === data.payload.method
                ) {
                    happyProviderBus.emit("response:complete", {
                        key: data.key,
                        windowId: data.windowId,
                        error: null,
                        payload: hasPermission({ eth_accounts: {} }) ? getDefaultStore().get(userAtom)?.addresses : [],
                    })
                    return
                }

                // not allowed if not logged in (should log in, then be called on wallet client)
                if (connected && "wallet_requestPermissions" === data.payload.method) {
                    happyProviderBus.emit("response:complete", {
                        key: data.key,
                        windowId: data.windowId,
                        error: null,
                        payload: hasPermission(...data.payload.params)
                            ? getPermissions(data.payload)
                            : new Array<WalletPermission>(),
                    })
                    return
                }

                // not allowed if not logged in (should log in, then be called on wallet client)
                if (connected && "wallet_revokePermissions" === data.payload.method) {
                    revokePermission(...data.payload.params)
                    happyProviderBus.emit("response:complete", {
                        key: data.key,
                        windowId: data.windowId,
                        error: null,
                        payload: getPermissions(data.payload as Parameters<typeof getPermissions>[0]),
                    })
                    return
                }

                if (!isPublicMethod) {
                    throw new UnauthorizedProviderError(new Error("Not allowed"))
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
                happyProviderBus.emit("response:complete", {
                    key: data.key,
                    windowId: data.windowId,
                    error: getEIP1193ErrorObjectFromUnknown(e),
                    payload: null,
                })
            }
        })
    }, [publicClient, requiresConfirmation])
}
