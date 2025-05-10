import type { SwitchCheckedChangeDetails } from "@ark-ui/react"
import { PermissionNames } from "@happy.tech/common"
import { useCallback, useState } from "react"
import type { Address } from "viem"
import { Switch } from "#src/components/primitives/toggle-switch/Switch"
import { type PermissionDescriptionIndex, permissionDescriptions } from "#src/constants/requestLabels"
import { useHasPermissions } from "#src/hooks/useHasPermissions"
import { revokedSessionKeys } from "#src/state/interfaceState"
import {
    type AppPermissions,
    type SessionKeyRequest,
    type WalletPermission,
    grantPermissions,
    revokePermissions,
} from "#src/state/permissions"
import type { AppURL } from "#src/utils/appURL"
import { SessionKeyContract } from "./caveats/SessionKeyContract"

interface ListItemProps {
    permission: WalletPermission
}

const ListItem = ({ permission }: ListItemProps) => {
    const hasPermission = useHasPermissions(permission.parentCapability, permission.invoker as AppURL)

    // These are the contract target that have active session keys. We maintain those in React state so that we can
    // toggle them back. In particular this is important when toggling the entire session key category on and off.
    const [activeSessionKeys, setActiveSessionKeys] = useState(() => {
        if (permission.parentCapability !== PermissionNames.SESSION_KEY) return []
        return permission.caveats.map((c) => c.value as Address)
    })

    const addActiveSessionKey = (app: AppURL, request: SessionKeyRequest) => {
        const target = request[PermissionNames.SESSION_KEY].target
        setActiveSessionKeys((prev) => [...prev, target])
        grantPermissions(app, request)
        revokedSessionKeys.delete(target)
    }

    const removeActiveSessionKey = (app: AppURL, request: SessionKeyRequest) => {
        const target = request[PermissionNames.SESSION_KEY].target
        setActiveSessionKeys((prev) => prev.filter((t) => t !== target))
        revokePermissions(app, request)
        // revokePermission will add to revokedSessionKeys.
    }

    const onSwitchToggle = useCallback(
        (e: SwitchCheckedChangeDetails) => {
            const app = permission.invoker as AppURL
            const isSessionKey = permission.parentCapability === PermissionNames.SESSION_KEY

            if (!isSessionKey) {
                // No caveat to worry about for now.
                if (e.checked) grantPermissions(app, permission.parentCapability)
                else revokePermissions(app, permission.parentCapability)
            }

            for (const target of activeSessionKeys) {
                if (e.checked) {
                    grantPermissions(app, { [PermissionNames.SESSION_KEY]: { target } })
                    revokedSessionKeys.delete(target as Address)
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

                    revokePermissions(app, { [PermissionNames.SESSION_KEY]: { target } })
                    revokedSessionKeys.add(target as Address)
                }
            }
        },
        [permission, activeSessionKeys],
    )

    return (
        <div className="w-full">
            <Switch
                checked={hasPermission}
                onCheckedChange={onSwitchToggle}
                className="justify-between w-full [&_[data-part=label]]:w-3/4 flex-row-reverse text-base-content dark:text-neutral-content"
                switchLabel={
                    permissionDescriptions?.[permission.parentCapability as PermissionDescriptionIndex] ?? "---"
                }
            />
            {activeSessionKeys.length > 0 && (
                <div className="px-3 pt-3 text-xs">
                    <p className="italic pb-1.5 text-base-content/50 dark:text-neutral-content/50">
                        {permission.caveats.length} contract{permission.caveats.length > 1 && "s"} approved:
                    </p>
                    {activeSessionKeys.map((target, index) => (
                        <SessionKeyContract
                            showControl={hasPermission}
                            appURL={permission.invoker as AppURL}
                            contract={target}
                            key={`${permission.invoker}-${permission.parentCapability}-${target}-${index}`}
                            addActiveSessionKey={addActiveSessionKey}
                            removeActiveSessionKey={removeActiveSessionKey}
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
