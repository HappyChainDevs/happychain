import { useAtomValue } from "jotai"
import { useAccount } from "wagmi"
import { type AppPermissions, permissionsMapAtom } from "#src/state/permissions"
import { type AppURL, isIframe } from "#src/utils/appURL"

function useGetAllDappsWithPermissions(): [string, AppPermissions][] {
    const permissionsMap = useAtomValue(permissionsMapAtom)
    const account = useAccount()

    return Object.entries(permissionsMap[account?.address ?? "0x0"] ?? {}) //
        .filter(([app]) => !isIframe(app as AppURL))
}

export { useGetAllDappsWithPermissions }
