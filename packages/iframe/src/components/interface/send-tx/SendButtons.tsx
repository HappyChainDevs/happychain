import { Link, useNavigate } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useCallback, useEffect } from "react"
import { type Address, parseEther } from "viem"
import { useSendTransaction } from "wagmi"
import { Button } from "#src/components/primitives/button/Button"
import { balanceExceededAtom, sendValueAtom, targetAddressAtom } from "#src/state/sendPageState"

const SendButtons = () => {
    const sendVal = useAtomValue(sendValueAtom)
    const targetAddress = useAtomValue(targetAddressAtom)
    const balanceExceeded = useAtomValue(balanceExceededAtom)

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
        if (targetAddress && sendVal) {
            void sendTransaction({
                to: targetAddress as Address,
                value: parseEther(sendVal),
            })
        }
    }, [sendTransaction, sendVal, targetAddress])

    return (
        <div className="flex flex-row w-full h-10 items-center justify-center m-3 gap-3 px-2">
            {
                // don't show the button if tx is in pending status (popup window is open)
                !isPending && (
                    <Link to={"/embed"} className="w-1/2">
                        <Button
                            className="flex justify-center rounded-xl w-full h-10 text-white disabled:opacity-50"
                            intent={"primary"}
                        >
                            Cancel
                        </Button>
                    </Link>
                )
            }
            <Button
                className="flex items-center justify-center rounded-xl w-1/2 h-10 text-white disabled:opacity-50"
                intent={"primary"}
                onClick={submitSend}
                disabled={!targetAddress || !sendVal || isPending || balanceExceeded}
                isLoading={isPending}
            >
                Continue
            </Button>
        </div>
    )
}

export default SendButtons
