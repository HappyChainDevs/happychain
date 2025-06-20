import { ArrowLeftIcon, ArrowsInSimpleIcon } from "@phosphor-icons/react"
import { useRouter } from "@tanstack/react-router"
import { navigationStateManager } from "#src/utils/NavStateManager"
import { signalClosed } from "#src/utils/walletState.ts"
import { TriggerSecondaryActionsMenu } from "./menu-secondary-actions/SecondaryActionsMenu"

export const GlobalHeader = () => {
    const router = useRouter()

    const handleBack = () => {
        navigationStateManager.popAndExecuteBackCallback()
        router.history.back()
    }

    return (
        <div className="relative max-w-prose mx-auto items-center w-full py-3 hidden lg:flex">
            {router.state.location.pathname !== "/embed" && (
                <button type="button" onClick={handleBack} aria-label="Go back" title="Go back">
                    <ArrowLeftIcon
                        weight="bold"
                        className="text-base-content absolute start-2 top-1/2 -translate-y-1/2"
                    />
                </button>
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
                    onClick={() => signalClosed(undefined)}
                >
                    <ArrowsInSimpleIcon weight="bold" />
                </button>
            </div>
        </div>
    )
}
