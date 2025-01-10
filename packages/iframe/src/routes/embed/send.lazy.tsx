import { createLazyFileRoute } from "@tanstack/react-router"
import { isAddress } from "viem"
import AddressSelector from "#src/components/interface/send-tx/AddressSelector"
import SendButtons from "#src/components/interface/send-tx/SendButtons"
import SendInput from "#src/components/interface/send-tx/SendInput"
import { useHappySendOptions } from "#src/hooks/useHappySendOptions"

export const Route = createLazyFileRoute("/embed/send")({
    component: Send,
})

function Send() {
    const { targetAddress } = useHappySendOptions()

    return (
        <div className="relative flex flex-col size-full items-center justify-between">
            <div className="flex flex-col size-full items-center justify-start">
                <AddressSelector />
                {/* appears when target address has been confirmed */}
                {targetAddress !== undefined && isAddress(targetAddress) && <SendInput />}
            </div>

            <SendButtons />
        </div>
    )
}
