import type { SwitchCheckedChangeDetails } from "@ark-ui/react"
import { PermissionNames } from "@happy.tech/common"
import { useCallback } from "react"
import type { Address, WalletPermissionCaveat } from "viem"
import { type PermissionDescriptionIndex, permissionDescriptions } from "#src/constants/requestLabels"
import { useHasPermissions } from "#src/hooks/useHasPermissions"
import { revokedSessionKeys } from "#src/state/interfaceState"
import { type AppPermissions, type WalletPermission, grantPermissions, revokePermissions } from "#src/state/permissions"
import type { AppURL } from "#src/utils/appURL"
import { Switch } from "../../primitives/toggle-switch/Switch"
import { SessionKeyContract } from "./caveats/SessionKeyContract"

interface CaveatControlProps {
    permissionName: string
    caveat: WalletPermissionCaveat
    appURL: AppURL
}

const CaveatControl = ({ caveat, appURL, permissionName }: CaveatControlProps) => {
    const hasPermission = useHasPermissions(permissionName, appURL)
    switch (permissionName) {
        case PermissionNames.SESSION_KEY:
            return <SessionKeyContract showControl={hasPermission} appURL={appURL} contract={caveat.value} />
        default:
            return null
    }
}

interface ListItemProps {
    permission: WalletPermission
}

const ListItem = ({ permission }: ListItemProps) => {
    const hasPermission = useHasPermissions(permission.parentCapability, permission.invoker as AppURL)

    const onSwitchToggle = useCallback(
        (e: SwitchCheckedChangeDetails) => {
            const isSessionKey = permission.parentCapability === PermissionNames.SESSION_KEY
            if (e.checked) {
                if (isSessionKey) revokedSessionKeys.clear()
                grantPermissions(permission.invoker as AppURL, permission.parentCapability)
            } else {
                // The sessions keys will be revoked when transitioning aways from the
                // page (cf. transition handler in `__root.tsx`). This avoids sending
                // redundant transactions if permissions are being toggled on and off.
                //
                // This is not 100% optimal, e.g. the user can toggle off the session keys and then
                // exit the page, causing the session keys to be deleted locally but not unregistered
                // onchain. This is generally safe — the session key will be lost (deleted) so unusable
                // despite being allowed onchain. This can only be a safety issues if the session keys
                // are stolen, but if that is possible, then we have much bigger problems to worry about.

                if (isSessionKey) {
                    revokedSessionKeys.clear()
                    permission.caveats.forEach((c) => revokedSessionKeys.add(c.value as Address))
                }
                revokePermissions(permission.invoker as AppURL, permission.parentCapability)
            }
        },
        [permission],
    )

    return (
        <div className="w-full">
            <Switch
                disabled={!hasPermission && permission.caveats.length > 0}
                checked={hasPermission}
                onCheckedChange={onSwitchToggle}
                className="justify-between w-full [&_[data-part=label]]:w-3/4 flex-row-reverse text-base-content dark:text-neutral-content"
                switchLabel={
                    permissionDescriptions?.[permission.parentCapability as PermissionDescriptionIndex] ?? "---"
                }
            />
            {permission.caveats.length > 0 && (
                <div className="px-3 pt-3 text-xs">
                    <p className="italic pb-1.5 text-base-content/50 dark:text-neutral-content/50">
                        {permission.caveats.length} contract{permission.caveats.length > 1 && "s"} approved:
                    </p>
                    {permission.caveats.map((caveat, index) => (
                        <CaveatControl
                            permissionName={permission.parentCapability}
                            appURL={permission.invoker as AppURL}
                            caveat={caveat}
                            key={`${permission.invoker}-${permission.parentCapability}-${caveat.value}-${index}`}
                        />
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

export const ListDappPermissions = ({ appURL, items }: ListDappPermissionsProps) => {
    if (Object.keys(items).length === 0)
        return (
            <p className="text-sm italic px-2 text-center py-24 w-10/12 mx-auto text-base-content/50">
                You did not grant any permission to this app.
            </p>
        )

    return (
        <ul className="divide-y divide-neutral/10">
            {Object.keys(items).map((permissionName) => {
                const permission = items[permissionName]
                return (
                    <li
                        className="text-xs w-full items-center inline-flex gap-4 justify-between p-2"
                        key={`edit-permission-${permissionName}-${appURL}`}
                    >
                        <ListItem permission={permission} />
                    </li>
                )
            })}
        </ul>
    )
}
