import { connect, disconnect } from "@happy.tech/core"
import { ConnectButton, useHappyWallet } from "@happy.tech/react"
import { toast } from "sonner"

export const ConnectionDemo = () => {
    const { user } = useHappyWallet()

    async function toggleUserConnection() {
        if (user) {
            await disconnect()
            toast.info("User Disconnected from HappyWallet.")
        } else {
            await connect()
            toast.info("User Connected to HappyWallet!")
        }
    }
    return (
        <div className="rounded-lg flex flex-col gap-4 p-4 backdrop-blur-sm bg-gray-200/35 col-span-2">
            <div className="text-lg font-bold">Connection Methods</div>

            <div className="flex flex-wrap sm:flex-nowrap gap-4">
                <div className="flex w-full sm:w-auto flex-col h-full justify-between">
                    <button
                        type="button"
                        onClick={toggleUserConnection}
                        className="rounded-lg bg-sky-300 p-2 shadow-xl"
                    >
                        {user ? "Disconnect" : "Connect"}
                    </button>
                    <small>Custom Button</small>
                </div>

                <span className="border border-gray-200/35 hidden sm:block" />

                <div className="flex flex-col h-full justify-between">
                    <ConnectButton />
                    <small>Default Badge</small>
                </div>
            </div>
        </div>
    )
}
