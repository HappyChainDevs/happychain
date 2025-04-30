import { CaretRight } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import happychainIcon from "#src/assets/happychain.png"
import type { AppPermissions } from "#src/state/permissions"
import { getAppURL } from "#src/utils/appURL"

interface ListItemProps {
    dappUrl: string
}

const ListItem = ({ dappUrl }: ListItemProps) => {
    const [isFaviconBroken, setIsFaviconBroken] = useState(false)

    return (
        <li className="p-2 min-h-10 flex hover:bg-accent/10 [&:focus-within_[data-part=icon]]:bg-accent/10 font-medium relative overflow-hidden text-ellipsis items-center text-sm">
            <span className="inline-flex gap-2 w-full max-w-prose mx-auto">
                <img
                    alt={dappUrl}
                    className="text-transparent rounded-full"
                    loading="lazy"
                    height="20"
                    width="20"
                    onError={() => setIsFaviconBroken(true)}
                    src={
                        isFaviconBroken || dappUrl.includes("localhost:")
                            ? happychainIcon
                            : `https://www.google.com/s2/favicons?domain=${dappUrl}&sz=16`
                    }
                />
                <span className="me-auto inline-block">{dappUrl}</span>
                <span className="p-0.5 rounded-full center" data-part="icon">
                    <CaretRight />
                </span>
            </span>
            <Link
                className="absolute size-full block inset-0 z-10 opacity-0"
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

const ListDappsWithPermissions = ({ items }: ListDappsWithPermissionsProps) => {
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
