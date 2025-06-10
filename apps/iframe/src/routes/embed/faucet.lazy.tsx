import { createLazyFileRoute } from "@tanstack/react-router"
import { FaucetView } from "#src/components/interface/home/tabs/views/Faucet.tsx"

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
