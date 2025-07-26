import type { SwitchCheckedChangeDetails } from "@ark-ui/react"
import type { Address } from "viem"
import { Switch } from "#src/components/primitives/toggle-switch/Switch"
import { PermissionName } from "#src/constants/permissions"
import { type PermissionDescriptionIndex, permissionDescriptions } from "#src/constants/requestLabels"
import { useLocalPermissionChanges } from "#src/hooks/useLocalPermissionChanges"
import type { PermissionsRequest } from "#src/state/permissions/types"
import type { AppPermissions, WalletPermission } from "#src/state/permissions/types"
import type { AppURL } from "#src/utils/appURL"
import { SessionKeyCheckbox } from "./SessionKeyCheckbox"

interface ListItemProps {
    permission: WalletPermission
}

const onSwitchToggle = (
    e: SwitchCheckedChangeDetails,
    allSessionKeys: string[],
    permission: WalletPermission,
    grant: (permissionRequest: PermissionsRequest) => void,
    revoke: (permissionRequest: PermissionsRequest) => void,
) => {
    const isSessionKey = permission.parentCapability === PermissionName.SessionKey

    if (!isSessionKey) {
        // No caveat to worry about for now.
        if (e.checked) grant(permission.parentCapability)
        else revoke(permission.parentCapability)
    }

    // We will loop through all session keys here, not just active ones, so that we can
    // re-enable all, after disabling all.
    for (const target of allSessionKeys) {
        if (e.checked) {
            grant({ [PermissionName.SessionKey]: { target } })
        } else {
            // The sessions keys will be unregistered onchain when transitioning away from
            // the page (cf. transition handler in `__root.tsx`). This avoids sending
            // redundant transactions if permissions are being toggled on and off.
            //
            // This is not 100% optimal, e.g. the user can toggle off the session keys and then
            // exit the page, causing the session keys to be deleted locally but not unregistered
            // onchain. This is generally safe — the session key will be lost (deleted) so unusable
            // despite being allowed onchain. This can only be a safety issues if the session keys
            // are stolen, but if that is possible, then we have much bigger problems to worry about.

            revoke({ [PermissionName.SessionKey]: { target } })
        }
    }
}

const ListItem = ({ permission }: ListItemProps) => {
    const { grant, revoke, has } = useLocalPermissionChanges()

    const allSessionKeys =
        permission?.parentCapability === PermissionName.SessionKey
            ? permission.caveats.map((c) => c.value as Address)
            : []

    // These are the active contract target that have active session keys.
    const activeSessionKeys = allSessionKeys.filter((target) => has({ [PermissionName.SessionKey]: { target } }))

    const checked =
        permission.parentCapability === PermissionName.SessionKey
            ? has(permission.parentCapability) && activeSessionKeys.length > 0
            : has(permission.parentCapability)

    return (
        <div className="w-full">
            <Switch
                checked={checked}
                onCheckedChange={(e) => onSwitchToggle(e, allSessionKeys, permission, grant, revoke)}
                className="justify-between w-full [&_[data-part=label]]:w-3/4 flex-row-reverse text-base-content dark:text-neutral-content"
                switchLabel={
                    permissionDescriptions?.[permission.parentCapability as PermissionDescriptionIndex] ?? "---"
                }
            />
            {allSessionKeys.length > 0 && (
                <div className="px-3 pt-3 text-xs">
                    <p className="italic pb-1.5 text-base-content/50 dark:text-neutral-content/50">
                        {activeSessionKeys.length} contract{activeSessionKeys.length > 1 && "s"} approved:
                    </p>
                    {allSessionKeys.map((target) => (
                        <SessionKeyCheckbox contract={target} key={`${permission.parentCapability}-${target}`} />
                    ))}
                </div>
            )}
        </div>
    )
}

interface ListDappPermissionsProps {
    items: AppPermissions
    appURL: AppURL
}

export const ListSingleAppPermissions = ({ appURL, items }: ListDappPermissionsProps) => {
    const permissionNames = Object.keys(items)

    if (permissionNames.length === 0)
        return (
            <p className="text-sm italic px-2 text-center py-24 w-10/12 mx-auto text-base-content/50">
                You did not grant any permission to this app.
            </p>
        )

    // Display connection permission first.
    const permissionsList: (readonly [string, WalletPermission])[] = [
        ...(permissionNames.includes("eth_accounts") ? [["eth_accounts", items.eth_accounts] as const] : []),
        ...permissionNames.filter((name) => name !== "eth_accounts").map((name) => [name, items[name]] as const),
    ]

    return (
        <ul className="divide-y divide-neutral/10">
            {permissionsList.map(([name, permission]) => {
                return (
                    <li
                        className="text-xs w-full items-center inline-flex gap-4 justify-between p-2"
                        key={`edit-permission-${name}-${appURL}`}
                    >
                        <ListItem permission={permission} />
                    </li>
                )
            })}
        </ul>
    )
}
