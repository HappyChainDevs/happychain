import { config } from "@happychain/sdk-shared"
import { useQuery } from "@tanstack/react-query"
import { useAtom, useAtomValue } from "jotai"
import { useAccount } from "wagmi"
import { permissionsMapAtom } from "../../../state/permissions"
import { userAtom } from "../../../state/user"

const KEY_QUERY_GET_ALL_DAPPS_WIHT_PERMISSIONS = "GET_ALL_DAPPS_WITH_PERMISSIONS"

function useGetAllDappsWithPermissions() {
    const user = useAtomValue(userAtom)
    const permissionsMap = useAtom(permissionsMapAtom)[0]
    const account = useAccount()

    /**
     * Get list of dapps for which the user has at least 1 permission granted
     */
    const queryGetAllDappsWithPermissions = useQuery({
        enabled: !!(user?.address && account?.address),
        queryKey: [KEY_QUERY_GET_ALL_DAPPS_WIHT_PERMISSIONS, account?.address],
        queryFn: () => {
            return permissionsMap[account.address!]
        },
        select(data) {
            if (!data) return
            return Object.entries(data).filter((record) => {
                const [dappUrl, dappPermissions] = record
                return dappUrl !== config.iframePath && Object.keys(dappPermissions).length > 0
            })
        },
    })
    return {
        queryGetAllDappsWithPermissions,
    }
}

type ResultGetAllDappsWithPermissions = ReturnType<
    typeof useGetAllDappsWithPermissions
>["queryGetAllDappsWithPermissions"]

export {
    useGetAllDappsWithPermissions,
    KEY_QUERY_GET_ALL_DAPPS_WIHT_PERMISSIONS,
    type ResultGetAllDappsWithPermissions,
}
