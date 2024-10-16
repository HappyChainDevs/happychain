import type { HTTPString } from "@happychain/common"
import { type FC, useMemo } from "react"
import { useHasPermissions } from "../../../hooks/useHasPermissions"
import { grantPermissions, revokePermissions } from "../../../services/permissions"
import type { AppPermissions } from "../../../state/permissions"
import { queryClient } from "../../../tanstack-query/config"
import { getDappOrigin } from "../../../utils/getDappOrigin"
import { Switch } from "../../primitives/toggle-switch/Switch"
import { KEY_QUERY_GET_ALL_DAPPS_WIHT_PERMISSIONS } from "../menu-secondary-actions/dapps-permissions/DialogAllDappsWithPermissions"

const DICTIONARIES_PERMISSIONS_MEANING = {
    eth_accounts: "Can recognize you by the Ethereum address you're currently using",
}
type Permission = keyof typeof DICTIONARIES_PERMISSIONS_MEANING

interface ListItemProps {
    permission: Permission
    dappUrl: HTTPString
}
/**
 * Let the user toggle a given permission on/off
 */
const ListItem: FC<ListItemProps> = (props) => {
    const { permission, dappUrl } = props
    const hasPermission = useHasPermissions(permission)
    const isCurrentDapp = useMemo(() => new URL(dappUrl).host === new URL(getDappOrigin()).host, [dappUrl])
    return (
        <>
            <Switch
                checked={hasPermission}
                title={
                    !hasPermission && !isCurrentDapp
                        ? "Visit this dapp to enable this permission back"
                        : "Toggle this permission"
                }
                disabled={!hasPermission && !isCurrentDapp}
                onCheckedChange={(e) => {
                    e.checked === false
                        ? revokePermissions(permission)
                        : grantPermissions(permission, {
                              origin: dappUrl,
                          })
                    queryClient.invalidateQueries({ queryKey: [KEY_QUERY_GET_ALL_DAPPS_WIHT_PERMISSIONS] })
                }}
                className="justify-between w-full [&_[data-part=label]]:w-3/4 flex-row-reverse"
                switchLabel={DICTIONARIES_PERMISSIONS_MEANING[permission]}
            />
        </>
    )
}

interface ListDappPermissionsProps {
    list: AppPermissions
    dappUrl: HTTPString
}
/**
 * Displays all the permissions of a given dApp and lets the user revoke said permission(s)
 */
const ListDappPermissions: FC<ListDappPermissionsProps> = (props) => {
    const { dappUrl, list } = props
    return (
        <ul className="divide-y divide-neutral/10">
            {Object.keys(list).map((permission) => {
                return (
                    <li
                        className="text-xs w-full items-center inline-flex gap-4 justify-between p-2"
                        key={`edit-permission-${permission}-${dappUrl}`}
                    >
                        <ListItem dappUrl={dappUrl} permission={permission as Permission} />
                    </li>
                )
            })}
        </ul>
    )
}

export { ListDappPermissions }
