import { validateNumericInput } from "@happychain/common"
import { useAtom } from "jotai"
import { useAtomValue } from "jotai"
import { debounce } from "lodash"
import type React from "react"
import { useCallback, useState } from "react"
import { formatEther, parseEther } from "viem"
import { useBalance } from "wagmi"
import { trackSendAtom } from "../../../state/interfaceState"
import { userAtom } from "../../../state/user"

interface SendInputProps {
    sendValue: string | undefined
    setSendValue: React.Dispatch<React.SetStateAction<string | undefined>>
}

const SendInput = ({ sendValue, setSendValue }: SendInputProps) => {
    const user = useAtomValue(userAtom)
    const [isExceedingBalance, setIsExceedingBalance] = useState<boolean>(false)
    const [trackSend] = useAtom(trackSendAtom)

    const { data: balance } = useBalance({ address: user?.address })

    const handleTokenBalanceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        let inputValue = event.target.value.trim()
        inputValue = inputValue.replace(/[^0-9.,]/g, "")

        // If there's a comma, assume it's the decimal separator (European format)
        if (inputValue.includes(",")) {
            const parts = inputValue.split(",")

            // Remove periods (thousand separators) from the integer part
            const integerPart = parts[0].replace(/\./g, "")
            // Join the integer part with the fractional part, replacing the comma with a period for JS decimal handling
            inputValue = `${integerPart}.${parts[1] || ""}`
        } else {
            // If no comma, treat any period as the decimal separator (standard format)
            const parts = inputValue.split(".")

            // Remove thousand separators from the integer part (if any)
            const integerPart = parts[0].replace(/\./g, "")
            // Combine the integer part with the fractional part
            inputValue = parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart
        }

        // Handle cases where the input starts with '0' and the next character is a number (eg. '05' -> '0.5')
        if (inputValue.startsWith("0") && inputValue.length > 1 && !inputValue.includes(".")) {
            inputValue = `0.${inputValue.substring(1)}`
        }

        setSendValue(inputValue)
        debounceValidationAndBalance(inputValue)
    }

    // debounce the validation check
    const debounceValidationAndBalance = debounce((inputValue: string) => {
        const formattedValue = inputValue

        // Perform validation and balance checking
        if (validateNumericInput(formattedValue) || formattedValue === "") {
            // Check if the input value exceeds the balance
            setIsExceedingBalance(formattedValue && balance?.value ? parseEther(formattedValue) > balance.value : false)
        }
    }, 500)

    const handleMaxButtonClick = useCallback(() => {
        if (balance) {
            setSendValue(formatEther(balance.value))
            setIsExceedingBalance(false)
        }
    }, [balance, setSendValue])

    return (
        <div className="flex flex-col items-center justify-start h-[110px] w-full border-slate-700 border-t border-b my-3 px-3">
            <div className="flex flex-row h-[60px] w-full items-center justify-between">
                <div className="flex flex-col items-start justify-start">
                    <p className="text-[18px]">$HAPPY</p>
                    <p className="text-[12px]">{balance ? `Balance: ${formatEther(balance.value)}` : "0"}</p>
                </div>

                <div className="flex flex-col items-end justify-end">
                    <div className="flex flex-row grow items-center justify-end space-x-2">
                        <input
                            className={`w-[100px] h-[30px] text-[20px] px-2 text-slate-600 text-right placeholder:text-[20px] placeholder:text-slate-600 placeholder:opacity-50 ${
                                isExceedingBalance ? "border-red-500" : ""
                            }`}
                            placeholder={"0"}
                            value={sendValue || ""}
                            onChange={handleTokenBalanceChange}
                            disabled={!balance || trackSend}
                        />

                        <p className="text-[14px]">HAPPY</p>
                    </div>

                    <button
                        className="flex text-center text-[14px] text-white border border-blue-600 px-2 rounded-lg bg-blue-600 disabled:opacity-50"
                        type="button"
                        onClick={handleMaxButtonClick}
                        disabled={!balance || trackSend}
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

export default SendInput
