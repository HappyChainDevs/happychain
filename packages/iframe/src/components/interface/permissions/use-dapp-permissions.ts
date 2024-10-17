import type { HTTPString } from "@happychain/common"
import { useQuery } from "@tanstack/react-query"
import { useAtom, useAtomValue } from "jotai"
import { useAccount } from "wagmi"
import { permissionsAtom } from "../../../state/permissions"
import { userAtom } from "../../../state/user"

const KEY_QUERY_GET_DAPP_PERMISSIONS = "GET_DAPP_PERMISSIONS"

function useGetDappPermissions(dappUrl: HTTPString) {
    const user = useAtomValue(userAtom)
    const permissionsMap = useAtom(permissionsAtom)[0]
    const account = useAccount()

    /**
     * Get list of permissions the user granted to the dapp with url `dappUrl`
     */
    const queryGetDappPermissions = useQuery({
        enabled: !!(user?.address && account?.address),
        queryKey: [KEY_QUERY_GET_DAPP_PERMISSIONS, account?.address, dappUrl],
        queryFn: () => {
            return permissionsMap[account.address!]
        },
        select(data) {
            if (!data) return
            const record = Object.entries(data).filter((record) => {
                const [url] = record
                return url === dappUrl
            })[0]
            const [url, permissions] = record

            if (permissions && url)
                return {
                    url,
                    permissions,
                }
            return
        },
    })
    return {
        queryGetDappPermissions,
    }
}

type ResultGetDappPermissions = ReturnType<typeof useGetDappPermissions>["queryGetDappPermissions"]

export { useGetDappPermissions, KEY_QUERY_GET_DAPP_PERMISSIONS, type ResultGetDappPermissions }
