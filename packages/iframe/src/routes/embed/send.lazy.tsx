import { createLazyFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { type Address, isAddress } from "viem"
import AddressSelector from "../../components/interface/send-tx/AddressSelector"
import SendButtons from "../../components/interface/send-tx/SendButtons"
import SendInput from "../../components/interface/send-tx/SendInput"

export const Route = createLazyFileRoute("/embed/send")({
    component: Send,
})

function Send() {
    // address to send $HAPPY to
    const [targetAddress, setTargetAddress] = useState<Address | string | undefined>(undefined)
    // amount to send
    const [sendValue, setSendValue] = useState<string | undefined>(undefined)

    return (
        <div className="relative flex flex-col w-full h-full items-center justify-between">
            <div className="flex flex-col w-full h-full items-center justify-start">
                <AddressSelector targetAddress={targetAddress} setTargetAddress={setTargetAddress} />
                {/* appears when target address has been confirmed */}
                {targetAddress !== undefined && isAddress(targetAddress) && (
                    <SendInput sendValue={sendValue} setSendValue={setSendValue} />
                )}
            </div>

            <SendButtons sendValue={sendValue} targetAddress={targetAddress} />
        </div>
    )
}
