import { CircleNotch } from "@phosphor-icons/react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect } from "react"
import { type Address, parseEther } from "viem"
import { useSendTransaction } from "wagmi"

interface SendButtonsInterface {
    sendValue: string | undefined
    targetAddress: Address | string | undefined
}

const SendButtons = ({ sendValue, targetAddress }: SendButtonsInterface) => {
    const navigate = useNavigate()
    const { sendTransaction, isPending, isSuccess } = useSendTransaction()

    useEffect(() => {
        // if tx is successful, move back to home page of wallet
        if (isSuccess) {
            navigate({ to: "/embed" })
        }
    }, [isSuccess, navigate])

    const submitSend = useCallback(() => {
        if (targetAddress && sendValue) {
            // send tx
            sendTransaction({
                to: targetAddress as Address,
                value: parseEther(sendValue),
            })
        }
    }, [sendTransaction, sendValue, targetAddress])

    return (
        <div className="flex flex-row w-full h-10 items-center justify-center m-3 gap-3 px-2">
            {
                // don't show the button if tx is in pending status (popup window is open)
                !isPending && (
                    <Link
                        className="flex items-center justify-center rounded-lg w-full h-10 bg-blue-500 text-center text-white disabled:opacity-50"
                        to={"/embed"}
                    >
                        Cancel
                    </Link>
                )
            }
            <button
                className="flex items-center justify-center rounded-lg w-full h-10 bg-blue-500 text-center text-white disabled:opacity-50"
                type="button"
                onClick={submitSend}
                disabled={!targetAddress || !sendValue || isPending}
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

export default SendButtons
