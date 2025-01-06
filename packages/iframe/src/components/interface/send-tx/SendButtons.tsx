import { Link, useNavigate } from "@tanstack/react-router"
import { useAtom } from "jotai"
import { useCallback, useEffect } from "react"
import { type Address, parseEther } from "viem"
import { useSendTransaction } from "wagmi"
import { Button } from "#src/components/primitives/button/Button"
import { balanceExceeded, sendValue, targetAddress } from "#src/state/sendPageState"

const SendButtons = () => {
    const [sendVal] = useAtom(sendValue)
    const [inputAddress] = useAtom(targetAddress)
    const [exceededFlag] = useAtom(balanceExceeded)

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
        if (inputAddress && sendVal) {
            void sendTransaction({
                to: inputAddress as Address,
                value: parseEther(sendVal),
            })
        }
    }, [sendTransaction, sendVal, inputAddress])

    return (
        <div className="flex flex-row w-full h-10 items-center justify-center m-3 gap-3 px-2">
            {
                // don't show the button if tx is in pending status (popup window is open)
                !isPending && (
                    <Link
                        to={"/embed"}
                        className="flex justify-center rounded-xl w-[50%] h-10 text-white disabled:opacity-50"
                    >
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
                className="flex items-center justify-center rounded-xl w-[50%] h-10 text-white disabled:opacity-50"
                intent={"primary"}
                onClick={submitSend}
                disabled={!inputAddress || !sendValue || isPending || exceededFlag}
                isLoading={isPending}
            >
                Continue
            </Button>
        </div>
    )
}

export default SendButtons
