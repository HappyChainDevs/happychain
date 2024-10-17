import { CaretRight } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import type { FC } from "react"
import { getAppURL } from "../../../utils/appURL"
import type { ResultGetAllDappsWithPermissions } from "./use-list-dapps-with-permissions"

interface ListItemProps {
    dappUrl: string
}
const ListItem: FC<ListItemProps> = (props) => {
    const { dappUrl } = props
    return (
        <li className="inline-flex w-full p-2 min-h-10 hover:bg-accent/10 [&:focus-within_[data-part=icon]]:bg-accent/10 font-medium relative overflow-hidden text-ellipsis items-center gap-2 text-sm">
            <img
                loading="lazy"
                height="16"
                width="16"
                alt={dappUrl}
                src={`https://www.google.com/s2/favicons?domain=${dappUrl}&sz=16`}
            />
            <span className="me-auto inline-block">{dappUrl}</span>
            <span className="p-0.5 rounded-full center" data-part="icon">
                <CaretRight />
            </span>
            <Link
                className="absolute w-full h-full block inset-0 z-10 opacity-0"
                to="/embed/permissions/$dappId"
                params={{ dappId: encodeURI(dappUrl) }}
            >
                Open {dappUrl} detailed permissions list
            </Link>
        </li>
    )
}

interface ListDappsWithPermissionsProps {
    query: ResultGetAllDappsWithPermissions
}
/**
 * List of dapps with permissions for a given user.
 * When selecting a dapp, the user is redirected to that dapp detailed permissions page
 *
 * Query status based rendering :
 * [error] : error message
 * [pending] : loading  indicator
 * [success] : all dapps with 1 or more permissions
 */
const ListDappsWithPermissions: FC<ListDappsWithPermissionsProps> = (props) => {
    const { query } = props

    if (query.status === "error")
        return (
            <p className="text-sm italic px-2 text-center py-8 w-10/12 mx-auto text-neutral/50">
                Something went wrong.
            </p>
        )

    if (query.status === "pending") return <>...</>
    if ((query?.data?.length ?? 0) === 0)
        return (
            <p className="text-sm italic px-2 text-center py-24 w-10/12 mx-auto text-neutral/50">
                {" "}
                It seems there aren't any apps you gave permissions to.
            </p>
        )

    return (
        <ul className="flex flex-col">
            <ListItem dappUrl={getAppURL()} />
            {query
                .data!.filter((record) => record[0] !== getAppURL())
                .map((record) => {
                    const [dappUrl] = record

                    return <ListItem dappUrl={dappUrl} key={`list-permissions-dapp-${dappUrl}`} />
                })}
        </ul>
    )
}

export { ListDappsWithPermissions }
