/** @jsxImportSource preact */
import type { HappyUser } from "@happy.tech/wallet-common"
import { useEffect, useState } from "preact/hooks"
import { IFRAME_PATH } from "../env"
import { onUserUpdate } from "../functions"
import badgeStyles from "./styles/badge.css?inline"
import propertyStyles from "./styles/property.css?inline"
import { useConnection } from "./useConnection"

type ConnectButtonProps = { disableStyles: boolean }

export function BadgeWithStyles() {
    return <Badge disableStyles={false} />
}

export function BadgeWithoutStyles() {
    return <Badge disableStyles={true} />
}

function Badge({ disableStyles }: ConnectButtonProps) {
    const [user, setUser] = useState<HappyUser | undefined>(undefined)

    const { connecting, connect, open } = useConnection()

    useEffect(() => onUserUpdate((user) => setUser(user)), [])

    const connected = !!user?.address
    const onClick = connecting ? undefined : connected ? open : connect
    const state = connecting ? "connecting" : connected ? "connected" : "disconnected"

    return (
        <div>
            {disableStyles ? undefined : (
                <style>
                    {propertyStyles}
                    {badgeStyles}
                </style>
            )}
            <button
                type="button"
                className={`${!connected ? `${state} animated` : state} happychain-badge`}
                onClick={onClick}
                disabled={connecting}
            >
                <span>
                    <UserAvatar user={user} />
                    <div className="happychain-status">
                        <UserLabel user={user} connecting={connecting} />
                    </div>
                </span>
            </button>
        </div>
    )
}

const UserLabel = ({ user, connecting }: { user: HappyUser | undefined; connecting: boolean }) => {
    if (connecting) return <>Connecting</>
    if (!user) return <>Connect</>

    const label = user.ens || user.email || user.name
    return <>{label.length > 15 ? `${label.slice(0, 12)}...` : label}</>
}

const UserAvatar = ({ user }: { user: HappyUser | undefined }) => {
    const [loadFailed, setLoadFailed] = useState(false)
    if (!user?.avatar || loadFailed) {
        return (
            <img
                src={`${IFRAME_PATH}/images/happychainLogoSimple.png`}
                alt="HappyChain logo"
                className="happychain-icon"
            />
        )
    }

    return (
        <img src={user?.avatar} alt="HappyChain logo" className="happychain-icon" onError={() => setLoadFailed(true)} />
    )
}
