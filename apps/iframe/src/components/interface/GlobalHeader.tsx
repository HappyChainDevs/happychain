import { Msgs } from "@happy.tech/wallet-common"
import { ArrowLeft, ArrowsInSimple } from "@phosphor-icons/react"
import { GearSix } from "@phosphor-icons/react/dist/ssr"
import { Link, useLocation } from "@tanstack/react-router"
import { useAtom } from "jotai"
import { useCallback } from "react"
import { revokeSessionKeyPermissions } from "#src/requests/utils/sessionKeys.ts"
import { appMessageBus } from "#src/services/eventBus"
import { secondaryMenuVisibilityAtom } from "#src/state/interfaceState.ts"
import type { AppURL } from "#src/utils/appURL.ts"

function signalClosed() {
    void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: false })
}
const GlobalHeader = () => {
    const location = useLocation()
    const [isVisible, setVisibility] = useAtom(secondaryMenuVisibilityAtom)
    const optionsLabel = isVisible ? "Close options menu" : "Open options menu"

    const backButtonAction = useCallback(async () => {
        const pathname = location.pathname
        const isAppPermissionsPage = pathname.match(/^\/embed\/permissions\/(.+)$/)

        if (isAppPermissionsPage) {
            await revokeSessionKeyPermissions(decodeURIComponent(isAppPermissionsPage[1]) as AppURL)
        }
    }, [location])

    return (
        <div className="relative max-w-prose mx-auto items-center w-full py-1.5 hidden lg:flex">
            {location.pathname !== "/embed" && (
                <Link to={"/embed"} onClick={backButtonAction}>
                    <ArrowLeft weight="bold" className="text-base-content absolute start-2 top-1/2 -translate-y-1/2" />
                </Link>
            )}

            <span className="text-base-content text-[0.825rem] font-bold mx-auto hidden lg:flex justify-center">
                🤠 HappyChain
            </span>

            <div className="flex flex-row gap-1 items-center absolute end-2">
                <button
                    title={optionsLabel}
                    type="button"
                    aria-label={optionsLabel}
                    className="dark:opacity-60 text-lg"
                    onClick={() => {
                        // Don't toggle visibility: the menu will close if clicking the gear while the menu is open
                        // via the menu's own `onInteractOutsideHandler`.
                        if (!isVisible) setVisibility(true)
                    }}
                >
                    <GearSix weight="bold" />
                </button>
                <button
                    title="Hide wallet"
                    type="button"
                    aria-label="Click to hide wallet"
                    className="dark:opacity-60 text-lg"
                    onClick={signalClosed}
                >
                    <ArrowsInSimple weight="bold" />
                </button>
            </div>
        </div>
    )
}

export default GlobalHeader
