import { Msgs, type ProviderMsgsFromApp, requiresApproval } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useCallback, useEffect } from "react"

import { happyProviderBus } from "../services/eventBus"
import { hasPermission } from "../services/permissions/hasPermission"
import { chainsAtom } from "../state/chains"
import { userAtom } from "../state/user"

export function usePermissionsCheck() {
    const happyUser = useAtomValue(userAtom)
    const chains = useAtomValue(chainsAtom)

    /**
     * Calculates if the current request requires confirmation based
     * on the current internal state of the app
     */
    const checkIfRequestRequiresConfirmation = useCallback(
        (payload: ProviderMsgsFromApp[Msgs.PermissionCheckRequest]["payload"]) => {
            const basicCheck = requiresApproval(payload)
            //  if the basic check shows its a safe method, we can stop here, and report back
            if (!basicCheck) {
                return false
            }

            // if its a restricted method, and the user is
            // not logged in, then it needs confirmation
            // always (login screen)
            if (!happyUser?.address) {
                return true
            }

            switch (payload.method) {
                // users don't need to confirm if they are adding a chain thats already been added
                case "wallet_addEthereumChain":
                    return !chains.some((chain) => chain.chainId === payload.params[0].chainId)

                // users don't need to confirm if they are requesting to add permissions that have already been authorized
                case "wallet_requestPermissions":
                    return !hasPermission(...payload.params)
                case "eth_requestAccounts":
                    return !hasPermission({ eth_accounts: {} })
            }

            return true
        },
        [chains, happyUser],
    )

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
    useEffect(() => {
        return happyProviderBus.on(Msgs.PermissionCheckRequest, (data) => {
            const result = checkIfRequestRequiresConfirmation(data.payload)
            return happyProviderBus.emit(Msgs.PermissionCheckResponse, {
                key: data.key,
                windowId: data.windowId,
                error: null,
                payload: result,
            })
        })
    }, [checkIfRequestRequiresConfirmation])

    return { checkIfRequestRequiresConfirmation }
}
