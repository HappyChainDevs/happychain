import { Link, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { Button } from "#src/components/primitives/button/Button"
import { useHappySend } from "#src/hooks/useHappySend"

const SendButtons = () => {
    const { sendValue, targetAddress, balanceExceeded, submitSend, isSendSucess, isSendError, isSendPending } =
        useHappySend()

    const navigate = useNavigate()

    /**
     * This useEffect tracks whether the tx has landed successfully
     * or there is an error, navigates to the home page and shows the status of
     * the tx.
     */
    useEffect(() => {
        if (isSendSucess || isSendError) {
            navigate({ to: "/embed" }) // move back to home page of the wallet
            // TODO use toast component from ark to show success / error status
        }
    }, [isSendSucess, navigate, isSendError])

    return (
        <div className="flex flex-row w-full h-10 items-center justify-center m-3 gap-3 px-2">
            {
                // don't show the button if tx is in pending status (popup window is open)
                !isSendPending && (
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
                disabled={!targetAddress || !sendValue || isSendPending || balanceExceeded}
                isLoading={isSendPending}
            >
                Continue
            </Button>
        </div>
    )
}

export default SendButtons
