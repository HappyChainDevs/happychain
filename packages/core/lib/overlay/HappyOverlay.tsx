/** @jsxImportSource preact */
import { OverlayErrorCode } from "@happy.tech/wallet-common"
import { Dialog } from "./components/Dialog"
import { PopupBlocked } from "./components/dialogs/PopupBlocked"
import { UnknownError } from "./components/dialogs/UnknownError"
import { useErrorCode } from "./hooks/useErrorCode"
import cssStyles from "./styles.css?inline"

export const HappyOverlay = () => {
    const { hasError, errorCode, clearError } = useErrorCode(OverlayErrorCode.None)

    return (
        <>
            <style>{cssStyles}</style>

            <Dialog onClose={clearError} isOpen={hasError}>
                {(() => {
                    switch (errorCode) {
                        case OverlayErrorCode.PopupBlocked:
                            return <PopupBlocked />
                        default:
                            return <UnknownError />
                    }
                })()}
            </Dialog>
        </>
    )
}
