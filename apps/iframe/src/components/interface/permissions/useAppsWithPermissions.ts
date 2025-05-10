import { entries } from "@happy.tech/common"
import { useAtomValue } from "jotai"
import { useAccount } from "wagmi"
import { type AppPermissions, permissionsMapAtom } from "#src/state/permissions"
import { type AppURL, isIframe } from "#src/utils/appURL"

function useAppsWithPermissions(): [AppURL, AppPermissions][] {
    const permissionsMap = useAtomValue(permissionsMapAtom)
    const account = useAccount()

    return entries(permissionsMap[account?.address ?? "0x0"] ?? {}) //
        .filter(([app]) => !isIframe(app))
}

export { useAppsWithPermissions }
