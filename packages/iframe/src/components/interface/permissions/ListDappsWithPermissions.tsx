import { CaretRight } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import { type FC, useState } from "react"
import type { AppPermissions } from "../../../state/permissions"
import { getAppURL } from "../../../utils/appURL"

interface ListItemProps {
    dappUrl: string
}

const ListItem: FC<ListItemProps> = (props) => {
    const { dappUrl } = props
    const [isFaviconBroken, setIsFaviconBroken] = useState(false)

    return (
        <li className="inline-flex w-full p-2 min-h-10 hover:bg-accent/10 [&:focus-within_[data-part=icon]]:bg-accent/10 font-medium relative overflow-hidden text-ellipsis items-center gap-2 text-sm">
            <img
                alt={dappUrl}
                loading="lazy"
                height="16"
                onError={() => setIsFaviconBroken(true)}
                src={
                    isFaviconBroken || dappUrl.includes("localhost:")
                        ? "/happychain.png"
                        : `https://www.google.com/s2/favicons?domain=${dappUrl}&sz=16`
                }
                width="16"
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
    items: Array<[string, AppPermissions]>
}

const ListDappsWithPermissions: FC<ListDappsWithPermissionsProps> = (props) => {
    const { items } = props

    if (items.length === 0)
        return (
            <p className="text-sm italic px-2 text-center py-24 w-10/12 mx-auto text-neutral/50">
                {" "}
                It seems there aren't any apps you gave permissions to.
            </p>
        )

    return (
        <ul className="flex flex-col">
            <ListItem dappUrl={getAppURL()} />
            {items
                .filter((record) => record[0] !== getAppURL())
                .map((record) => {
                    const [dappUrl] = record
                    return <ListItem dappUrl={dappUrl} key={`list-permissions-dapp-${dappUrl}`} />
                })}
        </ul>
    )
}

export { ListDappsWithPermissions }
