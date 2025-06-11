import { entries } from "@happy.tech/common"
import { useAtomValue } from "jotai"
import { useAccount } from "wagmi"
import { type AppPermissions, permissionsMapAtom } from "#src/state/permissions"
import { type AppURL, isWallet } from "#src/utils/appURL"

export function useAppsWithPermissions(): [AppURL, AppPermissions][] {
    const permissionsMap = useAtomValue(permissionsMapAtom)
    const account = useAccount()

    // TODO: the default here should include the wallet app, but currently its empty
    // adding a permission to an unrelated app will cause the wallet to _also_ be
    // granted the default permissions and will then show up here
    return entries(permissionsMap[account?.address ?? "0x0"] ?? {}) //
        .filter(([app]) => !isWallet(app))
}
