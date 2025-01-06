import { createLazyFileRoute } from "@tanstack/react-router"
import { useAtom } from "jotai"
import { isAddress } from "viem"
import AddressSelector from "#src/components/interface/send-tx/AddressSelector"
import SendButtons from "#src/components/interface/send-tx/SendButtons"
import SendInput from "#src/components/interface/send-tx/SendInput"
import { targetAddress } from "#src/state/sendPageState.js"

export const Route = createLazyFileRoute("/embed/send")({
    component: Send,
})

function Send() {
    const [inputAddress] = useAtom(targetAddress)

    return (
        <div className="relative flex flex-col size-full items-center justify-between">
            <div className="flex flex-col size-full items-center justify-start">
                <AddressSelector />
                {/* appears when target address has been confirmed */}
                {inputAddress !== undefined && isAddress(inputAddress) && <SendInput />}
            </div>

            <SendButtons />
        </div>
    )
}
