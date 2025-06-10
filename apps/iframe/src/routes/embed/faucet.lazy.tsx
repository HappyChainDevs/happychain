import { createLazyFileRoute } from "@tanstack/react-router"
import { FaucetView } from "#src/components/interface/faucet/Faucet"

export const Route = createLazyFileRoute("/embed/faucet")({
    component: Faucet,
})

function Faucet() {
    return (
        <div className="max-w-prose mx-auto w-full py-4 px-2">
            <FaucetView />
        </div>
    )
}
