import { shortenAddress } from "@happychain/sdk-shared"
import { Check, Clipboard } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import type { Address } from "viem"

interface AddressInfoProps {
    address: Address
}

const AddressInfo = ({ address }: AddressInfoProps) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.stopPropagation()
        navigator.clipboard.writeText(address)
        setCopied(true)
    }

    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => {
                setCopied(false)
            }, 3000) // reset after 3 seconds

            return () => clearTimeout(timer)
        }
    }, [copied])

    return (
        <div className="flex flex-row items-center justify-center space-x-1">
            <p>{`${shortenAddress(address, 4)}`}</p>
            <div
                className="flex flex-row items-center justify-center tooltip"
                data-tip={copied ? "Copied!" : "Copy Address"}
            >
                <button
                    className="w-4 h-4 rounded-xl hover:opacity-80 items-center justify-center"
                    onClick={handleCopy}
                    type="button"
                >
                    {copied ? <Check size={15} /> : <Clipboard size={15} weight="duotone" />}
                </button>
            </div>
        </div>
    )
}

export default AddressInfo
