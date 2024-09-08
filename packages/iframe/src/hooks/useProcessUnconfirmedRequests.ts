import type { EIP1193RequestParameters, ProviderEventPayload } from "@happychain/sdk-shared"
import {
    AuthState,
    Messages,
    type ProviderBusEventsFromIframe,
    getChainFromSearchParams,
    getEIP1193ErrorObjectFromUnknown,
    waitForCondition,
} from "@happychain/sdk-shared"
import { getDefaultStore, useAtomValue } from "jotai"
import { useCallback, useEffect } from "react"
import { UnauthorizedProviderError } from "viem"
import { happyProviderBus } from "../services/eventBus"
import { getPermissions } from "../services/permissions/getPermissions"
import { hasPermission } from "../services/permissions/hasPermission"
import { revokePermission } from "../services/permissions/revokePermission"
import { authStateAtom } from "../state/authState"
import type { WalletPermission } from "../state/permissions"
import { publicClientAtom } from "../state/publicClient"
import { userAtom } from "../state/user"
import { confirmWindowId } from "../utils/confirmWindowId"
import { usePermissionsCheck } from "./usePermissionsCheck"

export function useProcessUnconfirmedRequests() {
    const publicClient = useAtomValue(publicClientAtom)

    const { checkIfRequestRequiresConfirmation: requiresConfirmation } = usePermissionsCheck()

    const respondWith = useCallback(
        (
            data: ProviderEventPayload<EIP1193RequestParameters>,
            payload: ProviderBusEventsFromIframe[Messages.RequestResponse]["payload"],
        ) => {
            happyProviderBus.emit(Messages.RequestResponse, {
                key: data.key,
                windowId: data.windowId,
                error: null,
                payload: payload,
            })
        },
        [],
    )

    const errorWith = useCallback(
        (
            data: ProviderEventPayload<EIP1193RequestParameters>,
            error: ProviderBusEventsFromIframe[Messages.RequestResponse]["error"],
        ) => {
            happyProviderBus.emit(Messages.RequestResponse, {
                key: data.key,
                windowId: data.windowId,
                error: error,
                payload: null,
            })
        },
        [],
    )

    // Untrusted requests can only be called using the public client
    // as they bypass the popup approval screen
    useEffect(() => {
        return happyProviderBus.on(Messages.RequestPermissionless, async (data) => {
            if (!confirmWindowId(data.windowId)) return

            if ("eth_chainId" === data.payload.method) {
                return respondWith(data, getChainFromSearchParams().chainId)
            }

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
                    const payload = hasPermission({ eth_accounts: {} })
                        ? getDefaultStore().get(userAtom)?.addresses
                        : []

                    return respondWith(data, payload)
                }

                // not allowed if not logged in (should log in, then be called on wallet client)
                if (connected && "wallet_requestPermissions" === data.payload.method) {
                    const payload = hasPermission(...data.payload.params)
                        ? getPermissions(data.payload)
                        : new Array<WalletPermission>()

                    return respondWith(data, payload)
                }

                // not allowed if not logged in (should log in, then be called on wallet client)
                if (connected && "wallet_revokePermissions" === data.payload.method) {
                    revokePermission(...data.payload.params)

                    const payload = getPermissions(data.payload as Parameters<typeof getPermissions>[0])

                    return respondWith(data, payload)
                }

                if (!isPublicMethod) {
                    throw new UnauthorizedProviderError(new Error("Not allowed"))
                }

                // injected providers are allowed to bypass the popup screen
                // as they have their own in-built popup security model

                const payload = await publicClient.request(data.payload as Parameters<typeof publicClient.request>)
                return respondWith(data, payload)
            } catch (e) {
                return errorWith(data, getEIP1193ErrorObjectFromUnknown(e))
            }
        })
    }, [publicClient, requiresConfirmation, respondWith, errorWith])
}
