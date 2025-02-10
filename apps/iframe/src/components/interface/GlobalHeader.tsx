import { Msgs } from "@happy.tech/wallet-common"
import { ArrowLeft, XCircle } from "@phosphor-icons/react"
import { Link, useLocation } from "@tanstack/react-router"
import { appMessageBus } from "#src/services/eventBus.ts"

function signalClosed() {
    void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: false })
}
const GlobalHeader = () => {
    const location = useLocation()
    return (
        <div className="relative max-w-prose mx-auto items-center w-full p-1 hidden lg:flex">
            {location.pathname !== "/embed" && (
                <Link to={"/embed"}>
                    <ArrowLeft weight="bold" className="absolute left-2 top-5" />
                </Link>
            )}

            <span className="text-base-content dark:text-primary text-xl py-2 mx-auto hidden lg:flex justify-center">
                🤠 HappyChain
            </span>

            <XCircle weight="bold" className="size-8 shrink-0 absolute end-2 opacity-50" onClick={signalClosed} />
        </div>
    )
}

export default GlobalHeader
