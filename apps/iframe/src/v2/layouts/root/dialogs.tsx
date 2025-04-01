import { useMatch } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import type { PropsWithChildren } from "react"
import { userAtom } from "#src/state/user"
import { DialogConfirmLogOut } from "#src/v2/screens/logout/ConfirmLogout"
import {
    DialogClearDappsWithPermissions,
    PATHNAME_DAPPS_WITH_PERMISSIONS,
} from "#src/v2/screens/permissions/Permissions"
import { DialogClearPermissions, PATHNAME_DAPP_PERMISSIONS } from "#src/v2/screens/permissions/[$dappId]/AppPermissions"

/**
 * Dialogs common to all pages
 */
const Dialogs = ({ children }: PropsWithChildren) => {
    return (
        <div
            className="absolute pointer-events-none -top-3 -start-3 h-[calc(100%+(var(--spacing)*3))] w-[calc(100%+(var(--spacing)*6))]"
            data-scope="view"
            data-part="dialogs"
        >
            {children}
        </div>
    )
}
export const RootDialogsIsland = () => {
    const user = useAtomValue(userAtom)
    const matchAppsWithPermissions = useMatch({ from: PATHNAME_DAPPS_WITH_PERMISSIONS, shouldThrow: false })
    const matchPermissions = useMatch({ from: PATHNAME_DAPP_PERMISSIONS, shouldThrow: false })

    if (!user) return null

    // Add any dialog specific to certain pages here.
    // The island itself is positioned in the root layout
    // so that any dialog it renders will be have the right reference element for its positioning.
    // @note Ensure to your page-specific dialogs in <DialogsPositioner></DialogsPositioner>

    if (matchAppsWithPermissions)
        return (
            <Dialogs>
                <DialogClearDappsWithPermissions />
            </Dialogs>
        )

    if (matchPermissions)
        return (
            <Dialogs>
                <DialogClearPermissions />
            </Dialogs>
        )

    return (
        <Dialogs>
            <DialogConfirmLogOut />
        </Dialogs>
    )
}
