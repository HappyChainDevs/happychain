import { useCollapsible } from "@ark-ui/react"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { Button } from "#src/components/primitives/button/Button"
import { InlineDrawer } from "#src/components/primitives/collapsible/InlineDrawer"
import { hasPendingSessionKeys } from "#src/requests/modules/session-keys/helpers.ts"
import { clearAppPermissions } from "#src/state/permissions"
import { userAtom } from "#src/state/user.ts"
import type { AppURL } from "#src/utils/appURL"

interface ClearAllDappsPermissionsProps {
    url: AppURL
}

const ClearAllOrSelectedPermissions = ({ url }: ClearAllDappsPermissionsProps) => {
    const api = useCollapsible()
    const user = useAtomValue(userAtom)

    const hasPendingRevocations = hasPendingSessionKeys(user?.address)
    // biome-ignore lint/correctness/useExhaustiveDependencies: wait ya
    const { label, message } = useMemo(() => {
        return hasPendingRevocations
            ? {
                  label: "Clear Selected Permissions",
                  message:
                      "Some session keys are pending revocation.\nClearing permissions may require additional approval.",
              }
            : {
                  label: "Clear All Permissions",
                  message: "Are you sure you want to clear all permissions for this app?",
              }
    }, [user?.address, hasPendingRevocations])

    return (
        <InlineDrawer
            trigger={{
                label,
                intent: "ghost-negative",
            }}
            rootContext={api}
        >
            <p className="text-base-content text-center text-xs whitespace-pre-line">{message}</p>
            <div className="grid gap-2">
                <Button
                    onClick={() => {
                        clearAppPermissions(url)
                        api.setOpen(false)
                    }}
                    className="justify-center"
                    intent="outline-negative"
                >
                    Yes, clear all permissions
                </Button>
                <Button
                    intent="ghost"
                    className="opacity-75 justify-center"
                    onClick={() => {
                        api.setOpen(false)
                    }}
                >
                    Go back
                </Button>
            </div>
        </InlineDrawer>
    )
}

export { ClearAllOrSelectedPermissions }
