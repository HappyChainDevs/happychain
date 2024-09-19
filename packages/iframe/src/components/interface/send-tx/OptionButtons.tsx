import { useNavigate } from "@tanstack/react-router"
import React, { useCallback } from "react"
import type { Address } from "viem"

interface OptionButtonsInterface {
    sendValue: string | undefined
    targetAddress: Address | string | undefined
}

const OptionButtons = ({ sendValue, targetAddress }: OptionButtonsInterface) => {
    const navigate = useNavigate()

    // navigates back to home page
    const cancelButtonOptions = useCallback(() => {
        navigate({ to: "/embed" })
    }, [navigate])

    // triggers `eth_sendTransaction` popup only if address and send amounts are valid
    const continueButtonOptions = useCallback(() => {
        // send tx
    }, [])

    return (
        <div className="flex flex-row w-full h-10 items-center justify-center m-3 gap-3 px-2">
            <button
                className="flex items-center justify-center rounded-lg w-[50%] h-10 bg-blue-500 text-center text-white disabled:opacity-50"
                type="button"
                onClick={cancelButtonOptions}
            >
                Cancel
            </button>
            <button
                className="flex items-center justify-center rounded-lg w-[50%] h-10 bg-blue-500 text-center text-white disabled:opacity-50"
                type="button"
                onClick={continueButtonOptions}
                disabled={!targetAddress || !sendValue}
            >
                Continue
            </button>
        </div>
    )
}

export default OptionButtons
