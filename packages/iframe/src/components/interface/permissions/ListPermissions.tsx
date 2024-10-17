import type { FC } from "react"
import { useHasPermissions } from "../../../hooks/useHasPermissions"
import { grantPermissions, revokePermissions } from "../../../services/permissions"
import type { AppURL } from "../../../utils/appURL"
import { Switch } from "../../primitives/toggle-switch/Switch"
import type { ResultGetDappPermissions } from "./use-dapp-permissions"

const DICTIONARIES_PERMISSIONS_MEANING = {
    eth_accounts: "Can recognize you by the Ethereum address you're currently using",
}
type PermissionDescriptionIndex = keyof typeof DICTIONARIES_PERMISSIONS_MEANING

interface ListItemProps {
    permission: keyof typeof DICTIONARIES_PERMISSIONS_MEANING
    dappUrl: AppURL
}
/**
 * Let the user toggle a given permission on/off
 */
const ListItem: FC<ListItemProps> = (props) => {
    const { permission, dappUrl } = props
    const hasPermission = useHasPermissions(permission)
    return (
        <>
            <Switch
                checked={hasPermission}
                onCheckedChange={(e) => {
                    hasPermission ? revokePermissions(dappUrl, permission) : grantPermissions(dappUrl, permission)
                }}
                className="justify-between w-full [&_[data-part=label]]:w-3/4 flex-row-reverse"
                switchLabel={DICTIONARIES_PERMISSIONS_MEANING?.[permission] ?? "---"}
            />
        </>
    )
}

interface ListDappPermissionsProps {
    query: ResultGetDappPermissions
    dappUrl: AppURL
}
/**
 * Displays all the permissions of a given dApp and lets the user revoke said permission(s)
 *
 * Query status based rendering :
 * [error] : error message
 * [pending] : loading  indicator
 * [success] : permissions list
 */
const ListDappPermissions: FC<ListDappPermissionsProps> = (props) => {
    /**
     * Alternatively, we could render a predefined list of permissions (eg: `permissionsLists` ?) instead of only fetching the permissions the user granted
     */

    const { dappUrl, query } = props

    if (query.status === "error")
        return (
            <p className="text-sm italic px-2 text-center py-8 w-10/12 mx-auto text-neutral/50">
                Something went wrong.
            </p>
        )
    if (query.status === "pending") return <>...</>
    if ((Object.keys(query?.data?.permissions as object)?.length ?? 0) === 0)
        return (
            <p className="text-sm italic px-2 text-center py-24 w-10/12 mx-auto text-neutral/50">
                You did no grant any permission to this app.
            </p>
        )

    return (
        <ul className="divide-y divide-neutral/10">
            {Object.keys(query?.data?.permissions as object)?.map((permission) => {
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
