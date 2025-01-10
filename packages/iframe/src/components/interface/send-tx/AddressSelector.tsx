import { useAtom } from "jotai"
import type React from "react"
import { useEffect, useState } from "react"
import { isAddress } from "viem"
import { targetAddressAtom } from "#src/state/sendPageState"

const AddressSelector = () => {
    const [inputAddress, setInputAddress] = useAtom(targetAddressAtom)
    const [isValidAddr, setIsValidAddr] = useState(true)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value
        setInputAddress(value)
    }

    useEffect(() => {
        // also checks if the address checksum (capitalization) is valid
        setIsValidAddr(!inputAddress || isAddress(inputAddress, { strict: true }))
    }, [inputAddress])

    return (
        <div className="flex flex-col items-start justify-start w-full min-h-[50px] px-4 py-2">
            <p>To:</p>
            <input
                className={`bg-slate-300 opacity-50 text-[20px] px-2 w-full text-slate-600 box-border placeholder:text-[20px] placeholder:text-slate-600 ${
                    !isValidAddr ? "border-red-500" : ""
                }`}
                placeholder="Enter EVM address"
                value={inputAddress || ""}
                onChange={handleChange}
            />

            {!isValidAddr && <span className="text-[10px] text-red-500">Invalid EVM address</span>}
        </div>
    )
}

export default AddressSelector
