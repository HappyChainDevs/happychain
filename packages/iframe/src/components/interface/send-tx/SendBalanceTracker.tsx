import { validateNumericInput } from "@happychain/common"
import * as _ from "lodash"
import type React from "react"
import { useCallback, useState } from "react"
import { formatEther, parseEther } from "viem"

interface SendBalanceTrackerProps {
    balance: bigint | undefined
    sendValue: string | undefined
    setSendValue: React.Dispatch<React.SetStateAction<string | undefined>>
}

const SendBalanceTracker = ({ balance, sendValue, setSendValue }: SendBalanceTrackerProps) => {
    const [isExceedingBalance, setIsExceedingBalance] = useState<boolean>(false)

    const handleTokenBalanceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value.trim()
        setSendValue(inputValue)

        debounceValidationAndBalance(inputValue)
    }

    // debounce only the validation and balance check
    const debounceValidationAndBalance = _.debounce((inputValue: string) => {
        let formattedValue = inputValue

        // If the input starts with '0' and the second character is a number, add a period
        if (formattedValue.startsWith("0") && formattedValue.length > 1 && !formattedValue.includes(".")) {
            formattedValue = `0.${formattedValue.substring(1)}`
        }

        // Perform validation and balance checking
        if (validateNumericInput(formattedValue) || formattedValue === "") {
            // Check if the input value exceeds the balance
            setIsExceedingBalance(formattedValue && balance ? parseEther(formattedValue) > balance : false)
        }
    }, 500)

    const handleMaxButtonClick = useCallback(() => {
        if (balance) {
            setSendValue(formatEther(balance))
            setIsExceedingBalance(false)
        }
    }, [balance, setSendValue])

    return (
        <div className="flex flex-col items-center justify-start h-[120px] w-full border-slate-700 border-t border-b my-3 px-3">
            <div className="flex flex-row h-[60px] w-full items-center justify-between">
                <div className="flex flex-col items-start justify-start">
                    <p className="text-[18px]">$HAPPY</p>
                    <p className="text-[12px]">{balance ? `Balance: ${formatEther(balance)}` : "0"}</p>
                </div>

                <div className="flex flex-col items-end justify-end">
                    <div className="flex flex-row grow items-center justify-end space-x-2">
                        <input
                            className={`w-[100px] h-[30px] text-[20px] px-2 text-slate-600 text-right placeholder:text-[20px] placeholder:text-slate-600 placeholder:opacity-50 ${
                                isExceedingBalance ? "border-red-500" : ""
                            }`}
                            placeholder={`${balance ? formatEther(balance) : "0"}`}
                            value={sendValue || ""}
                            onChange={handleTokenBalanceChange}
                            disabled={!balance}
                        />

                        <p className="text-[14px]">HAPPY</p>
                    </div>

                    <button
                        className="flex text-center text-[14px] text-white border border-blue-600 px-2 rounded-lg bg-blue-600"
                        type="button"
                        onClick={handleMaxButtonClick}
                    >
                        Max
                    </button>
                </div>
            </div>

            {isExceedingBalance && (
                <div className="flex w-full items-center justify-center text-red-500">Not enough $HAPPY</div>
            )}
        </div>
    )
}

export default SendBalanceTracker
