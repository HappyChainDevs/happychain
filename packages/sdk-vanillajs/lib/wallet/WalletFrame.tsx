/** @jsxImportSource preact */
import { icon64x64 } from "../happyProvider/icons"
import { useAnimatedStateTransitions } from "./hooks/useAnimatedStateTransitions"
import { useAuthState } from "./hooks/useAuthState"
import { useIsOpen } from "./hooks/useIsOpen"
import { useWalletActions } from "./hooks/useWalletActions"
import { isFirefox } from "./utils"

const iframePermissions = isFirefox
    ? "" // Avoid warning in Firefox (safe: permissions inherited by default)
    : "; clipboard-write 'src'" // Explicit grant needed at least for Chrome

function onErrorHandler() {
    console.error("HappyChain SDK failed to initialize")
}

export interface WalletFrameProps {
    iframeSrc: string
    dragging: boolean
}

export const WalletFrame = ({ iframeSrc, dragging }: WalletFrameProps) => {
    const { isOpen } = useIsOpen()
    const { authState } = useAuthState()
    const { toggleWalletOpen } = useWalletActions()
    const { frame, iframe } = useAnimatedStateTransitions()

    return (
        <div
            // The open 'button' transforms into a simple iframe wrapper div when open.
            // It is not a 'close' button then since the iframe swallows all click events
            // with none if this visible for clicking, as it simply sets the iframe size.
            // We also don't want the full iframe wallet embedded inside of a 'button' at all times.
            role={!isOpen ? "button" : "generic"}
            aria-label={!isOpen ? "Open Wallet" : ""}
            tabIndex={0}
            ref={frame}
            onClick={toggleWalletOpen}
            onKeyDown={toggleWalletOpen}
            data-auth-state={authState}
            data-drag-state={dragging}
            className="wallet-frame"
        >
            {/* Base64 to avoid any bundle issues and network requests */}
            <img src={icon64x64} alt="HappyChain Logo" data-open-state={isOpen} className="wallet-logo" />

            <div className="wallet-iframe-wrapper" data-open-state={isOpen} data-auth-state={authState}>
                <iframe
                    ref={iframe}
                    data-open-state={isOpen}
                    data-auth-state={authState}
                    title="happy-iframe"
                    onError={onErrorHandler}
                    src={iframeSrc}
                    className="wallet-iframe"
                    allow={iframePermissions}
                />
            </div>
        </div>
    )
}
