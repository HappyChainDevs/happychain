import React from "react"

const SendTransactionSummary = () => {
    return (
        <div className="flex flex-col items-start justify-between w-[94%] h-full rounded-lg space-y-4 border-[1px] border-slate-700 m-8 p-4">
            <div className="flex flex-col space-y-4 items-start justify-start">
                <span className="text-slate-700 text-[17px]">Transaction Summary</span>
                <span className="text-slate-700 text-[14px]">Estimated gas: 20.56 $HAPPY</span>
                <span className="text-slate-700 text-[14px]">
                    Sending{" "}
                    {/* <span className="text-[18px]">
              {value ? value : "--"} {selectedToken?.symbol} to{" "}
              {shortenAddress(sendAddress)}
            </span> */}
                </span>
            </div>
            {/* done UX */}
            <div className="flex flex-row w-full space-x-4 items-center justify-center">
                <button
                    className={`flex items-center justify-center w-[50%] h-full`}
                    //   disabled={!validValue || !value}
                    // onClick={handleSendSuccess}
                >
                    Confirm
                </button>
                <button
                    className={`flex items-center justify-center w-[50%] h-full hover:text-green-200`}
                    // onClick={() => setViewState(ViewState.PRIMARY)}
                >
                    Reject
                </button>
            </div>
        </div>
    )
}

export default SendTransactionSummary
