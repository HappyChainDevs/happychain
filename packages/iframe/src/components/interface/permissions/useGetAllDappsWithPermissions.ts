import { config } from "@happychain/sdk-shared"
import { useAtomValue } from "jotai"
import { useAccount } from "wagmi"
import { permissionsMapAtom } from "../../../state/permissions"

function useGetAllDappsWithPermissions() {
    const permissionsMap = useAtomValue(permissionsMapAtom)
    const account = useAccount()

    const dappsWithPermissions =
        account?.address && permissionsMap[account.address]
            ? Object.entries(permissionsMap[account.address]).filter(
                  ([dappUrl, dappPermissions]) =>
                      dappUrl !== config.iframePath && Object.keys(dappPermissions).length > 0,
              )
            : []

    return {
        listDappsWithPermissions: dappsWithPermissions,
    }
}

export { useGetAllDappsWithPermissions }
