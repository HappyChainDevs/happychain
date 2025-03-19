import { useAtomValue } from "jotai"
import type { PropsWithChildren } from "react"
import { userAtom } from "#src/state/user.ts"
import { DialogConfirmLogOut } from "#src/v2/screens/logout/ConfirmLogout.tsx"

/**
 * Dialogs common to all pages
 */
const RootDialogs = ({ children }: PropsWithChildren) => {
    return (
        <div data-scope="view" data-part="dialogs">
            {children}
            <DialogConfirmLogOut />
        </div>
    )
}
export const RootDialogsIsland = () => {
    const user = useAtomValue(userAtom)
    if (!user) return null

    // Add any dialog specific to certain pages here.
    // The island itself is positioned in the root layout
    // so that any dialog it renders will be have the right reference element for its positioning.
    // @note Ensure to your page-specific dialogs in <RootDialogs></RootDialogs>

    return <RootDialogs />
}
