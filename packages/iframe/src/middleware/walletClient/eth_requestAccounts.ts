import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useCallback } from "react"
import { setPermission } from "../../services/permissions/setPermission"
import { userAtom } from "../../state/user"

export function useEthRequestAccountsMiddleware() {
    const happyUser = useAtomValue(userAtom)

    return useCallback(
        async (
            request: ProviderEventPayload<EIP1193RequestParameters>,
            next: () => Promise<EIP1193RequestResult>,
        ): Promise<EIP1193RequestResult> => {
            if ("eth_requestAccounts" !== request.payload.method) {
                return await next()
            }

            if (!happyUser) {
                return []
            }

            setPermission(request.payload)

            return happyUser.addresses ?? [happyUser.address]
        },
        [happyUser],
    )
}
