import { CircleNotch } from "@phosphor-icons/react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect } from "react"
import { type Address, parseEther, parseGwei } from "viem"
import { useSendTransaction } from "wagmi"

interface SendButtonsInterface {
    sendValue: string | undefined
    targetAddress: Address | string | undefined
}

const SendButtons = ({ sendValue, targetAddress }: SendButtonsInterface) => {
    const navigate = useNavigate()
    const { sendTransaction, isPending, isSuccess, isError } = useSendTransaction()

    /**
     * This useEffect tracks whether the tx has landed successfully
     * or there is an error, navigates to the home page and shows the status of
     * the tx.
     */
    useEffect(() => {
        if (isSuccess || isError) {
            navigate({ to: "/embed" }) // move back to home page of the wallet
            // TODO use toast component from ark to show success / error status
        }
    }, [isSuccess, navigate, isError])

    const submitSend = useCallback(() => {
        if (targetAddress && sendValue) {
            void sendTransaction({
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
