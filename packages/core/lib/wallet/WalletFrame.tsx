/** @jsxImportSource preact */
import { AuthState } from "@happy.tech/wallet-common"
import { IFRAME_PATH } from "../env"
import { useAnimatedStateTransitions } from "./hooks/useAnimatedStateTransitions"
import { useAuthState } from "./hooks/useAuthState"
import { useHappyUser } from "./hooks/useHappyUser"
import { useWalletActions } from "./hooks/useWalletActions"

export interface WalletFrameProps {
    dragging: boolean
}

export const WalletFrame = ({ dragging }: WalletFrameProps) => {
    const { authState } = useAuthState()
    const { user } = useHappyUser()
    const { toggleWalletOpen, isOpen } = useWalletActions()
    const { frame, iframe } = useAnimatedStateTransitions()

    const openable = !isOpen && !dragging

    const showSpinner = !user && authState === AuthState.Initializing

    return (
        <div
            // The open 'button' transforms into a simple iframe wrapper div when open.
            // When 'closed' it behaves as a standard button. Clicking on it will open the wallet.
            // When 'open' it will be a standard div. A button here doesn't work, as the iframe fills
            // the element, swallowing all clicks, rendering the button un-clickable.
            // Iframe is also not a valid descendant of a button.
            role={!isOpen ? "button" : undefined}
            aria-label={!isOpen ? "Open Wallet" : ""}
            tabIndex={0}
            ref={frame}
            onClick={(e) => openable && toggleWalletOpen(e)}
            onKeyDown={(e) => openable && toggleWalletOpen(e)}
            data-open-state={isOpen}
            data-has-user={!!user}
            data-auth-state={authState}
            data-drag-state={dragging}
            className="wallet-frame"
        >
            {showSpinner && <LoadingSpinner />}
            {/* Base64 to avoid any bundle issues and network requests */}
            <img
                src={`${IFRAME_PATH}/images/happychainLogoRope.png`}
                alt="HappyChain Logo"
                className="wallet-logo"
                inert={true}
            />

            <div className="wallet-iframe-wrapper" inert={!isOpen}>
                <div ref={iframe} style="width: 100%; height: 100%;">
                    <slot name="frame" />
                </div>
            </div>
        </div>
    )
}

const LoadingSpinner = () => (
    <div class="happy_loader_icon">
        {Array.from({ length: 2 }, (_, i) => (
            <div key={`dot_${i.toString()}`} />
        ))}
    </div>
)
