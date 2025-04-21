import { OverlayErrorCode } from "@happy.tech/wallet-common"
import { useEffect, useState } from "preact/hooks"
import { internalProvider } from "../../happyProvider"

export function useErrorCode(initial: OverlayErrorCode = OverlayErrorCode.None) {
    const [hasError, setHasError] = useState(Boolean(initial))
    const [errorCode, setErrorCode] = useState<OverlayErrorCode>(initial)

    useEffect(
        () =>
            internalProvider.onDisplayOverlayError((errorCode) => {
                setHasError(Boolean(errorCode))
                setErrorCode(errorCode)
            }),
        [],
    )

    return {
        errorCode,
        hasError,
        clearError: () => setHasError(false),
    }
}
