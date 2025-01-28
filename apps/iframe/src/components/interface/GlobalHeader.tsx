import { Msgs } from "@happy.tech/wallet-common"
import { ArrowLeft, ArrowSquareIn } from "@phosphor-icons/react"
import { Link, useLocation } from "@tanstack/react-router"
import { appMessageBus } from "#src/services/eventBus"

function signalClosed() {
    void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: false })
}
const GlobalHeader = () => {
    const location = useLocation()
    return (
        <div className="relative items-center w-full p-1 hidden lg:flex">
            {location.pathname !== "/embed" && (
                <Link to={"/embed"}>
                    <ArrowLeft weight="bold" className="text-base-content absolute start-2 top-5" />
                </Link>
            )}

            <span className="text-base-content text-xs font-bold py-2 mx-auto hidden lg:flex justify-center">
                🤠 HappyChain
            </span>
            <button
                title="Hide wallet"
                type="button"
                aria-label="Click to hide wallet"
                className="dark:opacity-60 text-lg shrink-0 absolute end-2"
                onClick={signalClosed}
            >
                <ArrowSquareIn weight="duotone" />
            </button>
        </div>
    )
}

export default GlobalHeader
