import { CircleNotch } from "@phosphor-icons/react"
import { useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect } from "react"
import { type Address, parseEther } from "viem"
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi"

interface OptionButtonsInterface {
    sendValue: string | undefined
    targetAddress: Address | string | undefined
}

const OptionButtons = ({ sendValue, targetAddress }: OptionButtonsInterface) => {
    const navigate = useNavigate()
    const { data: hash, isPending, sendTransaction } = useSendTransaction()

    const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

    useEffect(() => {
        // if tx is successful, move back to home page of wallet
        // @todo: show history tab once in home page
        if (isConfirmed) navigate({ to: "/embed" })
    }, [isConfirmed, navigate])

    // navigates back to home page
    const cancelButtonOptions = useCallback(() => {
        navigate({ to: "/embed" })
    }, [navigate])

    // triggers `eth_sendTransaction` popup only if address and send amounts are valid
    const continueButtonOptions = useCallback(() => {
        // send tx
        if (targetAddress && sendValue)
            sendTransaction({
                to: targetAddress as Address,
                value: parseEther(sendValue),
            })
    }, [sendTransaction, targetAddress, sendValue])

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
                {!isPending ? (
                    "Continue"
                ) : (
                    <div className="animate-spin">
                        <CircleNotch />
                    </div>
                )}
            </button>
        </div>
    )
}

export default OptionButtons
