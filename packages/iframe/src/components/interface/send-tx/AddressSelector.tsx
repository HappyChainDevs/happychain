import type React from "react"
import { useEffect, useState } from "react"
import { isAddress } from "viem"

interface AddressSelectorProps {
    targetAddress: string | undefined
    setTargetAddress: React.Dispatch<React.SetStateAction<string | undefined>>
}

const AddressSelector = ({ targetAddress, setTargetAddress }: AddressSelectorProps) => {
    const [isValidAddr, setIsValidAddr] = useState<boolean>(true)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTargetAddress(event.target.value)
    }

    useEffect(() => {
        // also checks if the address checksum (capitalization) is valid
        targetAddress
            ? setIsValidAddr(!!targetAddress && isAddress(targetAddress, { strict: true }))
            : setIsValidAddr(true)
    }, [targetAddress])

    return (
        <div className="flex flex-col items-start justify-start w-full h-20 px-4 py-2">
            <p>To:</p>
            <input
                className={`h-[50px] min-h-[50px] bg-slate-300 opacity-50 text-[20px] px-2 w-full text-slate-600 box-border placeholder:text-[20px] placeholder:text-slate-600 ${
                    !isValidAddr ? "border-red-500" : ""
                }`}
                placeholder="Enter EVM address"
                value={targetAddress || ""}
                onChange={handleChange}
            />

            {!isValidAddr && <span className="text-[10px] text-red-500">Invalid EVM address</span>}
        </div>
    )
}

export default AddressSelector
