import type { SwitchCheckedChangeDetails } from "@ark-ui/react"
import { PermissionNames } from "#src/constants/permissions"
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
import { SessionKeyCheckbox } from "./SessionKeyCheckbox"

interface ListItemProps {
    permission: WalletPermission
}

const ListItem = ({ permission }: ListItemProps) => {
    const hasPermission = useHasPermissions(permission.parentCapability, permission.invoker as AppURL)

    // Cache the initial list of all session keys, so that they remained displayed even after we turn some of them off.
    const [allSessionKeys] = useState(() => {
        if (permission.parentCapability !== PermissionNames.SESSION_KEY) return []
        return permission.caveats.map((c) => c.value as Address)
    })

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
            {allSessionKeys.length > 0 && (
                <div className="px-3 pt-3 text-xs">
                    <p className="italic pb-1.5 text-base-content/50 dark:text-neutral-content/50">
                        {activeSessionKeys.length} contract{activeSessionKeys.length > 1 && "s"} approved:
                    </p>
                    {allSessionKeys.map((target) => (
                        <SessionKeyCheckbox
                            appURL={permission.invoker as AppURL}
                            contract={target}
                            key={`${permission.parentCapability}-${target}`}
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

export const ListSingleAppPermissions = ({ appURL, items }: ListDappPermissionsProps) => {
    if (Object.keys(items).length === 0)
        return (
            <p className="text-sm italic px-2 text-center py-24 w-10/12 mx-auto text-base-content/50">
                You did not grant any permission to this app.
            </p>
        )

    const eth_accounts = PermissionNames.ETH_ACCOUNTS
    const permissionNames = Object.keys(items)

    // Display connection permission first.
    const permissionsList: (readonly [string, WalletPermission])[] = [
        ...(permissionNames.includes(eth_accounts) ? [[eth_accounts, items[eth_accounts]] as const] : []),
        ...permissionNames.filter((name) => name !== eth_accounts).map((name) => [name, items[name]] as const),
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
