import { CaretRightIcon } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import type { AppPermissions } from "#src/state/permissions/types"
import { getAppURL } from "#src/utils/appURL"

interface ListItemProps {
    appURL: string
}

const ListItem = ({ appURL }: ListItemProps) => {
    const [isFaviconBroken, setIsFaviconBroken] = useState(false)

    return (
        <li className="p-2 min-h-10 flex hover:bg-accent/10 [&:focus-within_[data-part=icon]]:bg-accent/10 font-medium relative overflow-hidden text-ellipsis items-center text-sm">
            <span className="inline-flex items-center gap-2 w-full max-w-prose mx-auto">
                <img
                    alt={appURL}
                    className="text-transparent rounded-full h-[1.5rem] w-[1.5rem] object-contain"
                    loading="lazy"
                    width="20"
                    height="20"
                    onError={() => setIsFaviconBroken(true)}
                    src={
                        isFaviconBroken || appURL.includes("localhost:")
                            ? "/images/happychainLogoSimple.png"
                            : `https://www.google.com/s2/favicons?domain=${appURL}&sz=20`
                    }
                />
                <span className="me-auto inline-block">{appURL}</span>
                <span className="p-0.5 rounded-full center" data-part="icon">
                    <CaretRightIcon />
                </span>
            </span>
            <Link
                className="absolute size-full block inset-0 z-10 opacity-0"
                to="/embed/permissions/$appURL"
                params={{ appURL }}
            >
                Open {appURL} detailed permissions list
            </Link>
        </li>
    )
}

interface ListDappsWithPermissionsProps {
    items: Array<[string, AppPermissions]>
}

export const ListAppsWithPermissions = ({ items }: ListDappsWithPermissionsProps) => {
    if (items.length === 0)
        return (
            <p className="text-sm italic px-2 text-center py-24 w-10/12 mx-auto text-content">
                {" "}
                It seems there aren't any apps you gave permissions to.
            </p>
        )

    return (
        <ul className="flex flex-col">
            <ListItem appURL={getAppURL()} />
            {items
                .filter((record) => record[0] !== getAppURL())
                .map((record) => {
                    const [dappUrl] = record
                    return <ListItem appURL={dappUrl} key={`list-permissions-dapp-${dappUrl}`} />
                })}
        </ul>
    )
}
