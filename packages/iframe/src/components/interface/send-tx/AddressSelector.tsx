import type React from "react"
import { useEffect, useState } from "react"
import { type Address, isAddress } from "viem"

const AddressSelector = () => {
    const [targetAddress, setTargetAddress] = useState<string | undefined>(undefined)

    const [validAddr, setIsValidAddr] = useState<boolean>(true)

    // handle keyclicks / paste
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTargetAddress(event.target.value)
    }

    useEffect(() => {
        if (
            targetAddress &&
            targetAddress !== "" &&
            !isAddress(targetAddress, { strict: true }) // checksum validation
        ) {
            setIsValidAddr(false)
        } else {
            setIsValidAddr(true)
        }
    }, [targetAddress])

    return (
        <div className="flex flex-col items-start justify-start w-full h-[10%] space-y-1 px-4">
            <p>To:</p>
            <input
                className={`h-[50px] bg-slate-300 opacity-50 text-[20px] px-2 w-full text-slate-600 placeholder:text-[20px] placeholder:text-slate-600 ${
                    !validAddr ? "border-red-500" : ""
                }`}
                placeholder="Enter EVM address"
                value={targetAddress || ""}
                onChange={handleChange}
            />

            {!validAddr && <span className="text-[10px] text-red-500">Invalid EVM address</span>}
        </div>
    )
}

export default AddressSelector
