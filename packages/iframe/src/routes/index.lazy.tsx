import { createLazyFileRoute } from "@tanstack/react-router"

import { useHappyAccount } from "../hooks/useHappyAccount"

export const Route = createLazyFileRoute("/")({
    component: Index,
})

function Index() {
    const { user } = useHappyAccount()

    return (
        <>
            {/* Stub to develop Wallet details page */}
            <div className="flex items-stretch gap-4">Wallet Details Page</div>
            <pre>{JSON.stringify(user, null, 2)}</pre>
        </>
    )
}
