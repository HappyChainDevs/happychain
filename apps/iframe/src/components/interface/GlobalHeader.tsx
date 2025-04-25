import { Msgs } from "@happy.tech/wallet-common"
import { ArrowLeft, ArrowsInSimple } from "@phosphor-icons/react"
import { GearSix } from "@phosphor-icons/react/dist/ssr"
import { Link, useLocation } from "@tanstack/react-router"
import { useAtom } from "jotai"
import { appMessageBus } from "#src/services/eventBus"
import { secondaryMenuVisibilityAtom } from "#src/state/interfaceState.ts"

function signalClosed() {
    void appMessageBus.emit(Msgs.WalletVisibility, { isOpen: false })
}
const GlobalHeader = () => {
    const location = useLocation()
    const [isVisible, setVisibility] = useAtom(secondaryMenuVisibilityAtom)
    return (
        <div className="relative max-w-prose mx-auto items-center w-full py-1.5 hidden lg:flex">
            {location.pathname !== "/embed" && (
                <Link to={"/embed"}>
                    <ArrowLeft weight="bold" className="text-base-content absolute start-2 top-1/2 -translate-y-1/2" />
                </Link>
            )}

            <span className="text-base-content text-[0.825rem] font-bold mx-auto hidden lg:flex justify-center">
                🤠 HappyChain
            </span>

            <div className="flex flex-row gap-1 items-center absolute end-2">
                <button
                    title={isVisible ? "Close this menu" : "Open this menu"}
                    type="button"
                    aria-label="Click to open options menu"
                    className="dark:opacity-60 text-lg"
                    onClick={() => {
                        setVisibility(!isVisible)
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
