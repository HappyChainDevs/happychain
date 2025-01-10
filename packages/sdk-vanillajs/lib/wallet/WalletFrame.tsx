/** @jsxImportSource preact */
import { icon64x64 } from "@happychain/common"
import { useAnimatedStateTransitions } from "./hooks/useAnimatedStateTransitions"
import { useAuthState } from "./hooks/useAuthState"
import { useWalletActions } from "./hooks/useWalletActions"

export interface WalletFrameProps {
    dragging: boolean
}

export const WalletFrame = ({ dragging }: WalletFrameProps) => {
    const { authState } = useAuthState()
    const { toggleWalletOpen, isOpen } = useWalletActions()
    const { frame, iframe } = useAnimatedStateTransitions()

    const openable = !isOpen && !dragging

    return (
        <div
            // The open 'button' transforms into a simple iframe wrapper div when open.
            // When 'closed' it behaves as a standard button. Clicking on it will open the wallet.
            // When 'open' it will be a standard div. A button here doesn't work, as the iframe fills
            // the element, swallowing all clicks, rendering the button un-clickable.
            // Iframe is also not a valid descendant of a button.
            role={!isOpen ? "button" : "generic"}
            aria-label={!isOpen ? "Open Wallet" : ""}
            tabIndex={0}
            ref={frame}
            onClick={(e) => openable && toggleWalletOpen(e)}
            onKeyDown={(e) => openable && toggleWalletOpen(e)}
            data-open-state={isOpen}
            data-auth-state={authState}
            data-drag-state={dragging}
            className="wallet-frame"
        >
            {/* Base64 to avoid any bundle issues and network requests */}
            <img src={icon64x64} alt="HappyChain Logo" className="wallet-logo" inert={true} />
            <div className="wallet-iframe-wrapper" inert={!isOpen}>
                <div ref={iframe} style="width: 100%; height: 100%;">
                    <slot name="frame" />
                </div>
            </div>
        </div>
    )
}
