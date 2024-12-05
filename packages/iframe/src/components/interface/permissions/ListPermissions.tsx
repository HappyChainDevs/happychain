import { type PermissionDescriptionIndex, permissionDescriptions } from "#src/constants/requestLabels"
import { useHasPermissions } from "#src/hooks/useHasPermissions"
import { type AppPermissions, grantPermissions, revokePermissions } from "#src/state/permissions"
import type { AppURL } from "#src/utils/appURL"
import { Switch } from "../../primitives/toggle-switch/Switch"

interface ListItemProps {
    permission: PermissionDescriptionIndex
    dappUrl: AppURL
}

const ListItem = ({ permission, dappUrl }: ListItemProps) => {
    const hasPermission = useHasPermissions(permission, dappUrl)

    return (
        <>
            <Switch
                checked={hasPermission}
                onCheckedChange={(e) => {
                    !e.checked ? revokePermissions(dappUrl, permission) : grantPermissions(dappUrl, permission)
                }}
                className="justify-between w-full [&_[data-part=label]]:w-3/4 flex-row-reverse text-neutral-content"
                switchLabel={permissionDescriptions?.[permission] ?? "---"}
            />
        </>
    )
}

interface ListDappPermissionsProps {
    items: AppPermissions
    dappUrl: AppURL
}

const ListDappPermissions = ({ dappUrl, items }: ListDappPermissionsProps) => {
    if (Object.keys(items).length === 0)
        return (
            <p className="text-sm italic px-2 text-center py-24 w-10/12 mx-auto text-neutral/50">
                You did not grant any permission to this app.
            </p>
        )

    return (
        <ul className="divide-y divide-neutral/10">
            {Object.keys(items).map((permission) => {
                return (
                    <li
                        className="text-xs w-full items-center inline-flex gap-4 justify-between p-2"
                        key={`edit-permission-${permission}-${dappUrl}`}
                    >
                        <ListItem dappUrl={dappUrl} permission={permission as PermissionDescriptionIndex} />
                    </li>
                )
            })}
        </ul>
    )
}
export { ListDappPermissions }
