import { shortenAddress } from "@happychain/sdk-shared"
import { useNavigate } from "@tanstack/react-router"
import type { Address } from "viem"

interface SendTransactionSummaryProps {
    targetAddress: Address
    sendValue: string
    sendFn: () => Promise<void>
}

const SendTransactionSummary = ({ targetAddress, sendValue, sendFn }: SendTransactionSummaryProps) => {
    const navigate = useNavigate()

    return (
        <div className="flex flex-col items-start justify-between rounded-lg space-y-4 border-[1px] border-slate-700 m-8 p-4">
            <div className="flex flex-col space-y-4 items-start justify-start">
                <span className="text-slate-700 text-[17px]">Transaction Summary</span>
                <span className="text-slate-700 text-[14px]">
                    Sending{" "}
                    {sendValue && (
                        <span className="text-[18px]">{`${sendValue} $HAPPY to ${shortenAddress(targetAddress)}`}</span>
                    )}
                </span>
            </div>
            {/* done UX */}
            <div className="flex flex-row w-full space-x-4 items-center justify-center">
                <button
                    className="flex items-center justify-center w-[50%] h-full hover:opacity-80"
                    type="button"
                    onClick={sendFn}
                >
                    Confirm
                </button>
                <button
                    className="flex items-center justify-center w-[50%] h-full hover:opacity-80"
                    onClick={() => navigate({ to: "/embed" })}
                    type="button"
                >
                    Reject
                </button>
            </div>
        </div>
    )
}

export default SendTransactionSummary
