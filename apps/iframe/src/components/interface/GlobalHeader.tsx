import { Msgs } from "@happy.tech/wallet-common"
import { ArrowLeftIcon, ArrowsInSimpleIcon } from "@phosphor-icons/react"
import { Link, useLocation } from "@tanstack/react-router"
import { appMessageBus } from "#src/services/eventBus"
import { TriggerSecondaryActionsMenu } from "./menu-secondary-actions/SecondaryActionsMenu"

function signalClosed() {
    void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: false })
}
export const GlobalHeader = () => {
    const location = useLocation()

    return (
        <div className="relative max-w-prose mx-auto items-center w-full py-3 hidden lg:flex">
            {location.pathname !== "/embed" && (
                <Link to={"/embed"}>
                    <ArrowLeftIcon
                        weight="bold"
                        className="text-base-content absolute start-2 top-1/2 -translate-y-1/2"
                    />
                </Link>
            )}

            <span className="text-base-content text-sm font-bold mx-auto hidden lg:flex justify-center">
                🤠 HappyChain
            </span>

            {/* wallet options */}
            <div className="flex flex-row gap-2 items-center absolute end-3 text-xl">
                <TriggerSecondaryActionsMenu />

                <button
                    title="Hide wallet"
                    type="button"
                    aria-label="Click to hide wallet"
                    className="dark:opacity-60"
                    onClick={signalClosed}
                >
                    <ArrowsInSimpleIcon weight="bold" />
                </button>
            </div>
        </div>
    )
}
