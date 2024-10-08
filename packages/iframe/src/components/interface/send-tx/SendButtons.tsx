import { CircleNotch } from "@phosphor-icons/react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useAtom, useAtomValue } from "jotai"
import { useCallback, useEffect } from "react"
import { type Address, parseEther } from "viem"
import { useBalance, useSendTransaction, useWaitForTransactionReceipt } from "wagmi"
import { userAtom } from "../../../state/user"
import { ContentType, trackSendAtom, walletInfoViewAtom } from "../../../state/interfaceState"

interface SendButtonsInterface {
    sendValue: string | undefined
    targetAddress: Address | string | undefined
}

const SendButtons = ({ sendValue, targetAddress }: SendButtonsInterface) => {
    const navigate = useNavigate()
    const user = useAtomValue(userAtom)
    const queryClient = useQueryClient()

    // wagmi hooks
    const { data: hash, isPending, sendTransaction, error } = useSendTransaction()
    const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })
    const { queryKey } = useBalance({ address: user?.address, query: { enabled: isPending } })

    const [, setView] = useAtom(walletInfoViewAtom)
    const [, setTrackSend] = useAtom(trackSendAtom)

    useEffect(() => {
        // if tx is successful, move back to home page of wallet
        if (isConfirmed) {
            setTrackSend({ val: false })
            setView(ContentType.TOKENS)
            navigate({ to: "/embed" })
        }
        if (error) {
            setTrackSend({ val: false })
        }
    }, [error, isConfirmed, setView, navigate, setTrackSend])

    useEffect(() => {
        const handleQueryInvalidation = async () => {
            if (error) {
                // await query invalidation if there is an error
                await queryClient.invalidateQueries({ queryKey })
            }
        }

        handleQueryInvalidation()
    }, [error, queryClient, queryKey])

    // navigates back to home page
    const cancelSend = useCallback(() => {
        navigate({ to: "/embed" })
    }, [navigate])

    const submitSend = useCallback(async () => {
        if (targetAddress && sendValue) {
            setTrackSend({ val: false })
            // send tx
            sendTransaction({
                to: targetAddress as Address,
                value: parseEther(sendValue),
            })

            await queryClient.invalidateQueries({ queryKey })
        }
    }, [sendTransaction, sendValue, targetAddress, queryClient, queryKey])

    return (
        <div className="flex flex-row w-full h-10 items-center justify-center m-3 gap-3 px-2">
            {
                // don't show the button if tx is in pending status (popup window is open)
                !isPending && (
                    <button
                        className="flex items-center justify-center rounded-lg w-full h-10 bg-blue-500 text-center text-white disabled:opacity-50"
                        type="button"
                        onClick={cancelSend}
                    >
                        Cancel
                    </button>
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
